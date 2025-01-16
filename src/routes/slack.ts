import { Hono } from 'hono';
import { z } from 'zod';

import { validateSlackRequest } from '@/lib/middleware/validate-slack-request';
import { zodValidator } from '@/lib/middleware/zod-validator';
import { blocks } from '@/lib/slack/blocks';
import { getDailyPuzzle } from '@/lib/lichess';
import { botContext } from '@/lib/middleware/bot-context';

const ZSlashCommandRequest = z.object({
  team_id: z.string(),
  // channel_id: z.string(),
  user_id: z.string(),
  // command: z.string(),
  // text: z.string(),
  token: z.string(),
  // api_app_id: z.string(),
  // response_url: z.string(),
}).transform((body) => ({
  teamId: body.team_id,
  userId: body.user_id,
}));

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

