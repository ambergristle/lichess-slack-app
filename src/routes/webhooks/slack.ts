import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';

import { generateRowId } from '@/lib/db/utils';
import {
  deleteSchedule,
  createSchedule,
  getSchedule,
} from '@/lib/db/queries/schedule';
import {
  zInteractiveRequestBody,
  zSlashCommandRequestBody,
} from '@/lib/dtos/slack';
import { getDailyPuzzle } from '@/lib/lichess';
import { blocks, getUserTimeZone, replaceOriginal, verifySlackSignature } from '@/lib/slack';
import { localizeUtc, parseCronTime, zonedToUtc } from '@/lib/utils/cron';
import { Oops, RequestError } from '@/lib/utils/errors';
import { interpolate } from '@/lib/utils/locale';
import { botContext } from '@/middleware/bot-context';
import { dbProvider } from '@/middleware/db-provider';
import { zodValidator } from '@/middleware/zod-validator';
import { timeout } from 'hono/timeout';

const SET_SCHEDULE_ID = 'schedule:set';
const CANCEL_SCHEDULE_ID = 'schedule:cancel';

export const slack = new Hono()
  // .use('*', cors())
  .use(
    '*',
    timeout(2.8 * 1000, () => {
      return new HTTPException(408, {
        message: 'Request took longer than 2.8 seconds',
      });
    })
  )
  .use('*', verifySlackSignature())
  .post(
    '/commands/:command',
    zodValidator('form', zSlashCommandRequestBody),
    // rateLimit<{}, string, { out: { form: SlashCommandRequestBody } }>({
    //   cost: 1,
    //   getKey: (c) => c.req.valid("form").userId,
    //   getStore: (c) => { },
    // }),
    dbProvider(),
    botContext(),
    async (c) => {
      const { localized } = c.var;

      switch (c.req.param('command')) {
        case 'help': {
          // #region Get command details
          return c.json(
            {
              blocks: [
                blocks.section({ text: localized.blocks.helpInfo }),
                blocks.divider(),
                blocks.section({ text: localized.blocks.helpPuzzle }),
                blocks.section({ text: localized.blocks.helpSchedule }),
              ],
            },
            200
          );
          // #endregion
        }
        case 'puzzle': {
          // #region Get daily puzzle (screenshot + url)
          const { puzzleThumbUrl, puzzleUrl } = await getDailyPuzzle();

          return c.json(
            {
              blocks: [
                blocks.image({
                  title: puzzleThumbUrl,
                  href: puzzleThumbUrl,
                  alt: localized.blocks.puzzleTitle,
                }),
                blocks.section({ text: puzzleUrl }),
              ],
            },
            200
          );
          // #endregion
        }
        case 'schedule': {
          // #region Get and set scheduled delivery time
          const { botId, channelId, locale, localized } = c.var;

          const scheduleId = generateRowId(`${botId}:${channelId}`);
          const schedule = await getSchedule(c.var.db, scheduleId);

          const { message, defaultPickerValue } = (() => {
            if (schedule) {
              const { cron, timeZone } = schedule;
              const scheduledAt = parseCronTime(cron);

              // parse (utc) cron string into structured data
              // localize UTC time

              const { defaultValue: defaultPickerValue, display: timeString } =
                localizeUtc(scheduledAt, timeZone, locale);

              return {
                defaultPickerValue,
                message: interpolate(localized.blocks.scheduleInfo, {
                  timeString,
                }),
              };
            }

            return {
              defaultPickerValue: '12:00',
              message: localized.blocks.schedulePrompt,
            };
          })();

          const { userId } = c.req.valid('form');

          const timezone = await (async () => {
            if (schedule?.timeZone) {
              return schedule.timeZone
            }

            return await getUserTimeZone(c.var.db, channelId, userId)
          })()

          const actions = schedule
            ? [
              blocks.actions([
                {
                  type: 'button',
                  action_id: CANCEL_SCHEDULE_ID,
                  value: schedule.jobId,
                  text: {
                    type: 'plain_text',
                    text: localized.blocks.cancelSchedule,
                  },
                },
              ]),
            ]
            : [];

          return c.json(
            {
              blocks: [
                blocks.section({
                  text: message,
                  accessory: {
                    action_id: SET_SCHEDULE_ID,
                    type: 'timepicker',
                    initial_time: defaultPickerValue,
                    timezone,
                    placeholder: {
                      type: 'plain_text',
                      text: localized.blocks.scheduleSelectTime,
                      emoji: true,
                    },
                  },
                }),
                ...actions,
              ],
            },
            200
          );
          // #endregion
        }
        default: {
          return c.json({
            response_type: 'ephemeral',
            text: localized.commandErrors.unknownCommand,
          });
        }
      }
    }
  )
  .post(
    '/interactions',
    zodValidator('form', zInteractiveRequestBody),
    // rateLimit<{}, string, { out: { form: SlashCommandRequestBody } }>({
    //   cost: 1,
    //   getKey: (c) => c.req.valid("form").userId,
    //   getStore: (c) => { },
    // }),
    dbProvider(),
    botContext(),
    async (c) => {
      const { botId, locale, localized } = c.var;

      const { channelId, userId, actions, responseUrl } = c.req.valid('form');

      const [action] = actions;
      switch (action.type) {
        case 'button': {
          // #region
          if (action.actionId === CANCEL_SCHEDULE_ID) {
            await deleteSchedule(c.var.db, botId, channelId);

            replaceOriginal(responseUrl, 'Your scheduled Daily Puzzle has been canceled!')
          }
          // #endregion
          break;
        }
        case 'timepicker': {
          // #region
          if (action.actionId !== 'schedule:set') {
            break;
          }

          const timeZone = await getUserTimeZone(c.var.db, channelId, userId);
          const cronTime = zonedToUtc(action.selectedTime, timeZone);

          await createSchedule(c.var.db, {
            botId,
            channelId,
            cronTime,
            timeZone,
            locale,
          });

          const { display } = localizeUtc(cronTime, timeZone, locale);
          const message = interpolate(localized.blocks.scheduleConfirmation, {
            timeString: display,
          });

          replaceOriginal(responseUrl, message)
          // #endregion
          break;
        }
        default: {
          throw new RequestError('Invalid Action payload.', {
            headers: c.req.raw.headers,
            body: { channelId, userId, actions, responseUrl },
          });
        }
      }

      return c.body(null, 200);
    }
  )
  .onError((error, c) => {
    const { status } = Oops.parseError(error);

    if (c.var.slackVerified) {
      if (c.req.path.startsWith('/commands')) {
        return c.json({
          response_type: 'ephemeral',
          text: 'Something went wrong',
        });
      }

      // if a response url is available
      // and the error is a 500?
      // use the response url?

      return c.json(null, status);
    }

    return c.json({ error: 'Forbidden' }, 403);
  });
