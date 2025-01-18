import { Hono } from 'hono';
import wretch from 'wretch'

import { botContext } from '@/lib/middleware/bot-context';
import { localizer } from '@/lib/middleware/localizer';
import { validateSlackRequest } from '@/lib/middleware/validate-slack-request';
import { zodValidator } from '@/lib/middleware/zod-validator';
import { getDailyPuzzle } from '@/lib/services/lichess';
import { blocks } from '@/lib/services/slack/blocks';
import { ZSlashCommandRequest, ZTimePickerActionRequest } from '@/lib/services/slack/schemas';
import { interpolate } from '@/lib/utils/locale';


// 3s window for response
// https://api.slack.com/interactivity/slash-commands#responding_to_commands

export const slack = new Hono()
  .use('*', validateSlackRequest())
  /** Get command details */
  .post(
    '/help',
    zodValidator('form', ZSlashCommandRequest),
    localizer(),
    botContext(),
    async (c) => {
      // locale source conflicg
      const { localized } = c.var;

      return c.json({
        blocks: [
          blocks.section({ text: localized.blocks.helpInfo }),
          blocks.divider(),
          blocks.section({ text: localized.blocks.helpPuzzle }),
          blocks.section({ text: localized.blocks.helpSchedule }),
        ],
      }, 200);
    },
  )
  /** Get daily puzzle (screenshot + url) */
  .post(
    '/puzzle',
    zodValidator('form', ZSlashCommandRequest),
    localizer(),
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
    },
  )
  /** Set scheduled delivery time */
  .post(
    '/schedule/set',
    zodValidator('form', ZTimePickerActionRequest),
    localizer(),
    botContext(),
    async (c) => {
      const { localized } = c.var;
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


      const message = interpolate(localized.blocks.scheduleConfirmation, {
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
    localizer(),
    botContext(),
    async (c) => {
      const { locale, localized } = c.var;

      const _scheduledAt = bot.getScheduledAt();
      const scheduledAt = _scheduledAt
        ? utcTimeToZoned(_scheduledAt, timeZone)
        : undefined;

      const initialTime = scheduledAt
        ? formatTimeInput(scheduledAt)
        : '12:00';

      const message = scheduledAt
        ? interpolate(localized.blocks.scheduleInfo, {
          timeString: localizeZonedTime(scheduledAt, timeZone, locale),
        })
        : localized.blocks.schedulePrompt;

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
                  text: localized.blocks.scheduleSelectTime,
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

    return c.json({
      response_type: 'ephemeral',
      text: 'Unknown command',
    });
  })
  .onError(async (error, c) => {
    const message = error instanceof Error
      ? error.message
      : 'Something went wrong'

    return c.json({
      response_type: 'ephemeral',
      text: message,
    });
  });

