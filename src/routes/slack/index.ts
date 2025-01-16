import { Hono } from 'hono';
import { z } from 'zod';

import { validateSlackRequest } from '@/lib/middleware/validate-slack-request';
import { zodValidator } from '@/lib/middleware/zod-validator';
import { blocks } from '@/lib/slack/blocks';
import { getDailyPuzzle } from '@/lib/lichess';
import { botContext } from '@/lib/middleware/bot-context';

/**
 * @see https://api.slack.com/interactivity/slash-commands#app_command_handling
 */
const ZSlashCommandRequest = z.object({
  team_id: z.string(),
  channel_id: z.string(),
  user_id: z.string(),
  command: z.string(),
  text: z.string(),
  token: z.string(),
  api_app_id: z.string(),
  response_url: z.string(),
}).transform((body) => ({
  teamId: body.team_id,
  channelId: body.channel_id,
  userId: body.user_id,
  command: body.command,
  text: body.text,
  token: body.token,
  apiAppId: body.api_app_id,
  responseUrl: body.response_url,
}));

const parseSlashCommandRequest: Parser<SlashCommandRequest> = parserFactory(
  ZSlashCommandRequest,
  {
    entityName: 'SlashCommandRequest',
    errorMessage: 'Recieved unprocessable request',
  },
);

/**
 * @see https://api.slack.com/reference/interaction-payloads/block-actions
 */
const ZTimePickerActionRequest = z.preprocess(
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
        .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    }).array().min(1),
  }),
);

const parseTimePickerActionRequest: Parser<TimePickerActionRequest> = parserFactory(
  ZTimePickerActionRequest,
  {
    entityName: 'TimePickerActionRequest',
    errorMessage: 'Recieved unprocessable request',
  },
);


/**
 * @see https://api.slack.com/reference/interaction-payloads/block-actions
 * This isn't that helpful actually; I couldn't find the original reference
 */

export const parseTimePickerData: Parser<TimePickerData> = (data) => {
  const request = parseTimePickerActionRequest(data);

  const selectedTime = request.actions[0]?.selected_time;
  if (!selectedTime) throw new ValidationError('No time selected', {
    entityName: 'TimePickerActionRequest',
    errors: [{
      path: 'actions.selected_time',
      message: 'Required',
    }],
  });

  const [hours, minutes] = selectedTime.split(':');

  return {
    teamId: request.team.id,
    userId: request.user.id,
    token: request.token,
    selectedTime: {
      hour: Number(hours),
      minute: Number(minutes),
    },
    responseUrl: request.response_url,
  };
};



export const slack = new Hono()
  .use('*', validateSlackRequest())
  /** Get command details */
  .post(
    '/help',
    zodValidator('form', ZSlashCommandRequest),
    botContext(),
    async (c) => {
      const { locale } = c.var;

      const localizations = await getLocalizations(locale);

      return c.json({
        blocks: [
          blocks.section({ text: localizations.blocks.helpInfo }),
          blocks.divider(),
          blocks.section({ text: localizations.blocks.helpPuzzle }),
          blocks.section({ text: localizations.blocks.helpSchedule }),
        ],
      }, 200);
    },
  )
  /** Get daily puzzle (screenshot + url) */
  .post(
    '/puzzle',
    zodValidator('form', ZSlashCommandRequest),
    botContext(),
    async (c) => {
      const { locale } = c.var;

      const { puzzleThumbUrl, puzzleUrl } = await getDailyPuzzle();
      const localizations = await getLocalizations(locale);

      return c.json({
        blocks: [
          blocks.image({
            title: puzzleThumbUrl,
            href: puzzleThumbUrl,
            alt: localizations.blocks.puzzleTitle,
          }),
          blocks.section({ text: puzzleUrl }),
        ],
      }, 200);
    },
  )
  /** Set scheduled delivery time */
  .post(
    '/schedule/set',
    botContext(),
    async (c) => {
      const { locale } = c.var;
      const { responseUrl, selectedTime } = c.req.valid('form');

      const currentSchedule = bot.schedule;

      if (currentSchedule) {
        await deleteSchedule(currentSchedule.scheduleId);
      }

      const cronData = zonedTimeToUtc(selectedTime, timeZone);
      const cron = toCron(cronData);

      const data: ScheduledPuzzleData = {
        uid: teamId,
        locale,
      };

      const { scheduleId } = await createSchedule({
        service: '/api/deliver',
        cron,
        data,
      });

      /** @todo db retry or session */
      await db.scheduleBot(teamId, {
        scheduleId,
        cron,
      });

      const timeString = localizeZonedTime(scheduledAt, timeZone, locale);
      const localizations = await getLocalizations(locale);

      const message = interpolate(localizations.blocks.scheduleConfirmation, {
        timeString,
      });


      /** @todo error handling */
      wretch(responseUrl).post({
        replace_original: true,
        text: message,
      });

      return c.text('ok', 200);
    },
  )
  /** Get and set scheduled delivery time */
  .post(
    '/schedule',
    zodValidator('form', ZSlashCommandRequest),
    botContext(),
    async (c) => {
      const { locale } = c.var;

      const _scheduledAt = bot.getScheduledAt();
      const scheduledAt = _scheduledAt
        ? utcTimeToZoned(_scheduledAt, timeZone)
        : undefined;

      const initialTime = scheduledAt
        ? formatTimeInput(scheduledAt)
        : '12:00';

      const localizations = await getLocalizations(locale);
      const message = scheduledAt
        ? interpolate(localizations.blocks.scheduleInfo, {
          timeString: localizeZonedTime(scheduledAt, timeZone, locale),
        })
        : localizations.blocks.schedulePrompt;

      return c.json({
        blocks: [
          blocks.section({ text: message }),
          {
            type: 'actions',
            block_id: 'timepicker-block',
            elements: [
              {
                type: 'timepicker',
                initial_time: initialTime,
                placeholder: {
                  type: 'plain_text',
                  text: localizations.blocks.scheduleSelectTime,
                  emoji: true,
                },
                action_id: 'timepicker-action',
              },
            ],
          },
        ],
      }, 200);
    },
  )
  .notFound(async (c) => {
    const localizations = await getLocalizations(locale);

    return c.json({
      response_type: 'ephemeral',
      text,
    });
  })
  .onError(async (error, c) => {

    const localizations = await getLocalizations(locale);

    const defaultMessage = localizations.somethingWentWrong;

    const message = command
      ? localizations.commandErrors[command] ?? defaultMessage
      : defaultMessage;

    const text = interpolate(localizations.blocks.error, {
      message,
    });

    return c.json({
      response_type: 'ephemeral',
      text,
    });
  });

