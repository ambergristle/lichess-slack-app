import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import wretch from 'wretch';
import { z } from 'zod';

import { setBotSchedule } from '@/lib/bot';
import { localizeUtc, parseCronTime } from '@/lib/cron';
import { getDailyPuzzle } from '@/lib/lichess';
import { interpolate } from '@/lib/locale';
import { blocks, verifySignature } from '@/lib/slack';
import { botContext } from '@/middleware/bot-context';
import { zodValidator } from '@/middleware/zod-validator';


const TIME_ZONE_OPTIONS = Intl.supportedValuesOf('timeZone')
  .map((timeZone) => ({ text: timeZone, value: timeZone }));

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

// https://api.slack.com/interactivity/handling#payloads
const parseInteractivePayload = z.object({
  payload: z.string(),
}).transform(({ payload }) => {
  return JSON.parse(payload);
}).parse;

/**
 * @see https://api.slack.com/reference/interaction-payloads/block-actions
 * @see https://api.slack.com/reference/block-kit/block-elements#timepicker
 */
const ZTimePickerActionBody = z.preprocess(
  parseInteractivePayload,
  z.object({
    team: z.object({
      id: z.string(),
    }),
    token: z.string(),
    response_url: z.string(),
    // add another action
    actions: z.tuple([
      z.object({
        action_id: z.string(),
        block_id: z.string(),
        selected_time: z.string()
          .trim()
          .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
      }),
      z.object({
        action_id: z.string(),
        block_id: z.string(),
        value: z.string(),
      }),
    ]),
  }, {
    message: 'Recieved unprocessable request',
  })
).transform((body) => {
  const timeStrings = body.actions[0].selected_time.split(':');
  const timeZone = body.actions[1].value;

  // Regex enforces string shape
  // eslint-disable-next-line
  const hourString = timeStrings[0]!;
  // eslint-disable-next-line
  const minuteString = timeStrings[1]!;

  return {
    teamId: body.team.id,
    responseUrl: body.response_url,
    timeZone,
    selectedTime: {
      hour: Number(hourString),
      minute: Number(minuteString),
    },
  };
});


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

      const { display } = localizeUtc(scheduledAt, timeZone, bot.locale);

      const message = interpolate(localized.blocks.scheduleConfirmation, {
        timeString: display,
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

      const zonedSchedule = schedule
        ? localizeUtc(parseCronTime(schedule.cron), schedule.timeZone, locale)
        : undefined;

      // todo: does this need additional zoning?
      const message = zonedSchedule
        ? interpolate(localized.blocks.scheduleInfo, {
          timeString: zonedSchedule.display,
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
                action_id: 'select-time',
                type: 'timepicker',
                initial_time: zonedSchedule
                  ? zonedSchedule.defaultValue
                  : '12:00',
                placeholder: {
                  type: 'plain_text',
                  text: localized.blocks.scheduleSelectTime,
                  emoji: true,
                },
                focus_on_load: true,
              },
              {
                actionId: 'select-timezone',
                type: 'static_select',
                options: TIME_ZONE_OPTIONS,
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

