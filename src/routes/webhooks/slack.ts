import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import wretch from 'wretch';
import { z } from 'zod';

import { setBotSchedule } from '@/lib/bot';
import { localizeZonedCronTime, parseCronTime, utcCronTimeToZoned } from '@/lib/cron';
import { getDailyPuzzle } from '@/lib/lichess';
import { interpolate } from '@/lib/locale';
import { blocks, formatTimeInput, verifySignature } from '@/lib/slack';
import { botContext } from '@/middleware/bot-context';
import { zodValidator } from '@/middleware/zod-validator';

/**
 * @see https://api.slack.com/interactivity/slash-commands#app_command_handling
 */
const ZSlashCommandBody = z.object({
  team_id: z.string(),
  command: z.string(),
  text: z.string(),
  api_app_id: z.string(),
  response_url: z.string(),
}, {
  message: 'Recieved unprocessable request',
}).transform((body) => ({
  teamId: body.team_id,
  command: body.command,
  text: body.text,
  apiAppId: body.api_app_id,
  responseUrl: body.response_url,
}));

// todo: this is nuts
// also time zone

/**
 * @see https://api.slack.com/reference/interaction-payloads/block-actions
 */
const ZTimePickerActionBody = z.preprocess(
  (data) => {
    const { payload } = z.object({
      payload: z.string()
        .transform((data) => JSON.parse(data)),
    }).parse(data);

    return payload;
  },
  z.object({
    team: z.object({
      id: z.string(),
    }),
    user: z.object({
      id: z.string(),
    }),
    token: z.string(),
    response_url: z.string(),
    actions: z.object({
      action_id: z.string(),
      block_id: z.string(),
      selected_time: z.string()
        .trim()
        .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .transform((selectedTime) => {
          const [hour, minute] = selectedTime.split(':');
          return {
            hour,
            minute,
          };
        }),
    }).array().min(1),
  }, {
    message: 'Recieved unprocessable request',
  })
);


// 3s window for response
// https://api.slack.com/interactivity/slash-commands#responding_to_commands

export const slack = new Hono()
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
      throw new HTTPException(403, {
        message: 'Forbidden',
        // Invalid User Agent
      });
    }

    if (!signature || !timestamp) {
      throw new HTTPException(401, {
        message: 'Unauthorized',
        // Unsigned
      });
    }

    const body = await c.req.text();
    const {
      signatureIsValid,
      timestampIsValid,
    } = verifySignature(c, body, signature, timestamp);

    // Obscure implementation details by throwing
    // after both validations have resolved
    if (!timestampIsValid) {
      throw new HTTPException(401, {
        message: 'Unauthorized',
        // Invalid Timestamp
      });
    }

    if (!signatureIsValid) {
      throw new HTTPException(401, {
        message: 'Unauthorized',
        // Invalid Signature
      });
    }

    await next();
  })
  /** Get command details */
  .post(
    '/help',
    zodValidator('form', ZSlashCommandBody),
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
  /** Set scheduled delivery time */
  .post(
    '/schedule/set',
    zodValidator('form', ZTimePickerActionBody),
    botContext(),
    async (c) => {
      const { bot, localized } = c.var;

      const { responseUrl, selectedTime, timeZone } = c.req.valid('form');

      const scheduledAt = await setBotSchedule(c, bot.teamId, {
        selectedTime,
        timeZone,
        locale: bot.locale,
        currentScheduleId: bot.schedule?.jobId,
      });

      const message = interpolate(localized.blocks.scheduleConfirmation, {
        timeString: localizeZonedCronTime(scheduledAt, timeZone, bot.locale),
      });

      /** @todo error handling */
      wretch(responseUrl)
        .post({
          replace_original: true,
          text: message,
        })
        .res()
        .catch(console.error);

      return c.text('ok', 200);
    }
  )
  /** Get and set scheduled delivery time */
  .post(
    '/schedule',
    zodValidator('form', ZSlashCommandBody),
    botContext(),
    async (c) => {
      const {
        bot: { locale, schedule },
        localized,
      } = c.var;

      const scheduledAt = schedule
        ? utcCronTimeToZoned(
          parseCronTime(schedule.cron),
          schedule.timeZone
        )
        : undefined;

      // todo: does this need additional zoning?
      const message = schedule && scheduledAt
        ? interpolate(localized.blocks.scheduleInfo, {
          timeString: localizeZonedCronTime(scheduledAt, schedule.timeZone, locale),
        })
        : localized.blocks.schedulePrompt;

      return c.json({
        blocks: [
          blocks.section({
            text: message,
          }),
          {
            type: 'actions',
            block_id: 'timepicker-block',
            elements: [
              {
                type: 'timepicker',
                initial_time: scheduledAt
                  ? formatTimeInput(scheduledAt)
                  : '12:00',
                placeholder: {
                  type: 'plain_text',
                  text: localized.blocks.scheduleSelectTime,
                  emoji: true,
                },
                action_id: 'timepicker-action',
              },
            ],
          },
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
    const message = error instanceof Error
      ? error.message
      : 'Something went wrong';

    return c.json({
      response_type: 'ephemeral',
      text: message,
    });
  });

