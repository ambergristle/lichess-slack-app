import { Hono } from 'hono';
import wretch from 'wretch';

import { localizeUtc } from '@/lib/cron';
import { interpolate } from '@/lib/locale';
import { cancelBotSchedule, setBotSchedule } from '@/lib/schedule';
import { ZInteractiveRequestBody } from '@/lib/slack/dtos';
import { BotContext, botContext } from '@/middleware/bot-context';
import { zodValidator } from '@/middleware/zod-validator';
import { processError } from '@/lib/errors';


export const interactionsRoute = new Hono<BotContext>()
  .post(
    '/',
    zodValidator('form', ZInteractiveRequestBody),
    botContext(),
    async (c) => {
      const { bot, localized } = c.var;

      const { actions, responseUrl } = c.req.valid('form');
      const [action] = actions;

      switch (action.type) {
          case 'button': {
            if (action.actionId === 'cancel-schedule') {
              await cancelBotSchedule(c, bot.id, bot.userId);


              wretch(responseUrl)
                .post({
                  replace_original: true,
                  text: 'Your scheduled Daily Puzzle has been canceled!',
                })
                .res()
                .catch(processError);
            }

            break;
          }
          case 'timepicker': {
            const { selectedTime } = action;

            if (action.actionId !== 'select-time') {
              console.info('bounce');
              break;
            }

            /** Set scheduled delivery time */

            const {
              utcCronTime,
              timeZone,
            } = await setBotSchedule(c, bot.teamId, bot.userId, {
              selectedTime,
              locale: bot.locale,
              currentScheduleId: bot.schedule?.jobId,
            });

            const { display } = localizeUtc(utcCronTime, timeZone, bot.locale);

            const message = interpolate(localized.blocks.scheduleConfirmation, {
              timeString: display,
            });

            wretch(responseUrl)
              .post({
                replace_original: true,
                text: message,
              })
              .res()
              .catch(processError);

            break;
          }
      }

      return c.body(null, 200);
    }
  )
  .notFound((c) => {
    const webhookUrl = c.var.bot?.webhookUrl;
    if (webhookUrl) {
      wretch(webhookUrl)
        .post({
          response_type: 'ephemeral',
          text: 'Server Error: Update failed',
        })
        .res()
        .catch(processError);
    }

    return c.body('Not Found', 404);
  })
  .onError((error, c) => {
    const { status, message } = processError(error);

    const webhookUrl = c.var.bot?.webhookUrl;
    if (webhookUrl) {
      wretch(webhookUrl)
        .post({
          response_type: 'ephemeral',
          text: message,
        })
        .res()
        .catch(processError);
    }

    return c.body('Server Error', 500);

  });
