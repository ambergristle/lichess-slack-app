import { Hono } from 'hono';

import { localizeUtc, parseCronTime } from '@/lib/cron';
import { getDailyPuzzle } from '@/lib/lichess';
import { interpolate } from '@/lib/locale';
import { blocks, getUserTimeZone, verifySignature } from '@/lib/slack';
import { botContext } from '@/middleware/bot-context';
import { zodValidator } from '@/middleware/zod-validator';
import { ZSlashCommandBody } from '@/lib/slack/dtos';
import { interactionsRoute } from './interactions';
import { slackBucket, userLimiter } from '@/middleware/rate-limiter';
import { AuthorizationError, processError } from '@/lib/errors';


// 3s window for response
// https://api.slack.com/interactivity/slash-commands#responding_to_commands

export const slackRoute = new Hono()
  .use(async (c, next) => {
    const {
      'user-agent': userAgent,
      'x-slack-signature': signature,
      'x-slack-request-timestamp': timestamp,
    } = c.req.header();

    const isFromSlackbot = !!userAgent?.includes(
      'Slackbot 1.0 (+https://api.slack.com/robots)'
    );

    if (!isFromSlackbot) {
      throw new AuthorizationError('Invalid User Agent');
    }

    if (!signature || !timestamp) {
      throw new AuthorizationError('Request Unsigned');
    }

    const body = await c.req.text();
    const {
      signatureIsValid,
      timestampIsValid,
    } = verifySignature(c, body, signature, timestamp);

    // Obscure implementation details by throwing
    // after both validations have resolved
    if (!timestampIsValid) {
      throw new AuthorizationError('Invalid Timestamp');
    }

    if (!signatureIsValid) {
      throw new AuthorizationError('Invalid Signature');
    }
    await next();
  })
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
        bot: { schedule, ...bot },
        localized,
      } = c.var;

      const { userId } = c.req.valid('form');

      const zonedSchedule = schedule
        ? localizeUtc(parseCronTime(schedule.cron), schedule.timeZone, bot.locale)
        : undefined;

      const message = zonedSchedule
        ? interpolate(localized.blocks.scheduleInfo, {
          timeString: zonedSchedule.display,
        })
        : localized.blocks.schedulePrompt;

      const timezone = schedule?.timeZone
        ?? await getUserTimeZone(c, bot.id, userId);

      const actions = zonedSchedule
        ? [blocks.actions([{
          type: 'button',
          action_id: 'cancel-schedule',
          value: schedule?.jobId,
          text: {
            type: 'plain_text',
            text: 'Cancel Schedule',
          },
        }])]
        : [];

      return c.json({
        blocks: [
          blocks.section({
            text: message,
            accessory: {
              action_id: 'select-time',
              type: 'timepicker',
              initial_time: zonedSchedule
                ? zonedSchedule.defaultValue
                : '12:00',
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

