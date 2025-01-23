import { Hono } from 'hono';

import { localizeUtc, parseCronTime } from '@/lib/utils/cron';
import { getDailyPuzzle } from '@/lib/services/lichess';
import { interpolate } from '@/lib/utils/locale';
import { blocks, getUserTimeZone } from '@/lib/services/slack';
import { botContext } from '@/middleware/bot-context';
import { zodValidator } from '@/middleware/zod-validator';
import { ZSlashCommandBody } from '@/lib/services/slack/dtos';
import { interactionsRoute } from './interactions';
import { slackBucket, userLimiter } from '@/middleware/rate-limiter';
import { processError } from '@/lib/utils/errors';
import { slackAuthorizer } from '@/middleware/slack-authorizer';


// 3s window for response
// https://api.slack.com/interactivity/slash-commands#responding_to_commands

export const slackRoute = new Hono()
  .use(slackAuthorizer())
  .route('/interactions', interactionsRoute)
  /** Get command details */
  .post(
    '/help',
    zodValidator('form', ZSlashCommandBody),
    userLimiter(slackBucket, 1),
    botContext(),
    async (c) => {
      const { localized } = c.var;

      return c.json({
        blocks: [
          blocks.section({ text: localized.blocks.helpInfo }),
          blocks.divider(),
          blocks.section({ text: localized.blocks.helpPuzzle }),
          blocks.section({ text: localized.blocks.helpSchedule }),
        ],
      }, 200);
    }
  )
  /** Get daily puzzle (screenshot + url) */
  .post(
    '/puzzle',
    zodValidator('form', ZSlashCommandBody),
    userLimiter(slackBucket, 1),
    botContext(),
    async (c) => {
      const { localized } = c.var;

      const { puzzleThumbUrl, puzzleUrl } = await getDailyPuzzle();

      return c.json({
        blocks: [
          blocks.image({
            title: puzzleThumbUrl,
            href: puzzleThumbUrl,
            alt: localized.blocks.puzzleTitle,
          }),
          blocks.section({ text: puzzleUrl }),
        ],
      }, 200);
    }
  )
  /** Get and set scheduled delivery time */
  .post(
    '/schedule',
    zodValidator('form', ZSlashCommandBody),
    userLimiter(slackBucket, 2),
    botContext(),
    async (c) => {
      const {
        bot: { schedule, locale, ...bot },
        localized,
      } = c.var;

      const {
        message,
        defaultPickerValue,
      } = (() => {
        if (schedule) {
          const { cron, timeZone } = schedule;
          const scheduledAt = parseCronTime(cron);

          const {
            defaultValue: defaultPickerValue,
            display: timeString,
          } = localizeUtc(scheduledAt, timeZone, locale);

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
      const timezone = schedule?.timeZone
        ?? await getUserTimeZone(c, bot.id, userId);

      const actions = schedule
        ? [
          blocks.actions([{
            type: 'button',
            action_id: 'cancel-schedule',
            value: schedule.jobId,
            text: {
              type: 'plain_text',
              text: 'Cancel Schedule',
            },
          }]),
        ]
        : [];

      return c.json({
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
      }, 200);
    }
  )
  .notFound(async (c) => {
    return c.json({
      response_type: 'ephemeral',
      text: 'Unknown command',
    });
  })
  .onError(async (error, c) => {
    const { status, message } = processError(error);

    return c.json({
      response_type: 'ephemeral',
      text: message,
    });
  });

