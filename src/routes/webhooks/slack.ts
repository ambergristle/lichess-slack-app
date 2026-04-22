import { Hono } from 'hono';

import { generateRowId } from '@/lib/db/utils';
import { deleteSchedule, createSchedule, getScheduleCurrent } from '@/lib/db/queries/schedule';
import { getDailyPuzzle } from '@/lib/lichess';
import { blocks, getUserTimeZone, verifySlackSignature } from '@/lib/slack';
import { ZInteractiveRequestBody, ZSlashCommandBody } from '@/lib/slack/dtos';
import { localizeUtc, parseCronTime, zonedToUtc } from '@/lib/utils/cron';
import { processError } from '@/lib/utils/errors';
import { interpolate } from '@/lib/utils/locale';
import { botContext } from '@/middleware/bot-context';
import { dbProvider } from '@/middleware/db-provider';
import { zodValidator } from '@/middleware/zod-validator';

export const slack = new Hono()
  .use(verifySlackSignature())
  .post(
    '/commands/:command',
    zodValidator('form', ZSlashCommandBody),
    // userLimiter(slackBucket, 1),
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
            200,
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
            200,
          );
          // #endregion
        }
        case 'schedule': {
          // #region Get and set scheduled delivery time
          const { botId, channelId, locale, localized } = c.var;

          const scheduleId = generateRowId(`${botId}:${channelId}`);
          const schedule = await getScheduleCurrent(c.var.db, scheduleId);

          const { message, defaultPickerValue } = (() => {
            if (schedule) {
              const { cron, timeZone } = schedule;
              const scheduledAt = parseCronTime(cron);

              const { defaultValue: defaultPickerValue, display: timeString } = localizeUtc(
                scheduledAt,
                timeZone,
                locale,
              );

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
          const timezone = schedule?.timeZone ?? (await getUserTimeZone(c, botId, userId));

          const actions = schedule
            ? [
                blocks.actions([
                  {
                    type: 'button',
                    action_id: 'cancel-schedule',
                    value: schedule.jobId,
                    text: {
                      type: 'plain_text',
                      text: 'Cancel Schedule',
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
                    action_id: 'select-time',
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
            200,
          );
          // #endregion
        }
        default: {
          return c.json({
            response_type: 'ephemeral',
            text: 'Unknown command',
          });
        }
      }
    },
  )
  .post(
    '/interactions',
    zodValidator('form', ZInteractiveRequestBody),
    // userLimiter(slackBucket, 1),
    dbProvider(),
    botContext(),
    async (c) => {
      const { botId, locale, localized } = c.var;

      const { channelId, userId, actions, responseUrl } = c.req.valid('form');

      const [action] = actions;
      switch (action.type) {
        case 'button': {
          // #region
          if (action.actionId === 'schedule:cancel') {
            await deleteSchedule(c.var.db, botId, channelId);

            // todo: handle error?
            fetch(responseUrl, {
              method: 'POST',
              body: JSON.stringify({
                replace_original: true,
                text: 'Your scheduled Daily Puzzle has been canceled!',
              }),
              headers: { 'content-type': 'application/json' },
            });
          }
          // #endregion
          break;
        }
        case 'timepicker': {
          // #region
          if (action.actionId !== 'schedule:set') {
            // todo: invalid action id
            break;
          }

          const timeZone = await getUserTimeZone(c, botId, userId);
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

          // todo: handle error?
          fetch(responseUrl, {
            method: 'POST',
            body: JSON.stringify({
              replace_original: true,
              text: message,
            }),
            headers: { 'content-type': 'application/json' },
          });
          // #endregion
          break;
        }
        default: {
          // todo: throw?
          break;
        }
      }

      return c.body(null, 200);
    },
  )
  .onError(async (error, c) => {
    const { status } = processError(error);

    return c.text('Something went wrong.', status);
  });
