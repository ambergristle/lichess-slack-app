import { Hono } from 'hono';
import wretch from 'wretch';

import { cancelBotSchedule, setBotSchedule } from '@/lib/entities/schedule';
import { ZInteractiveRequestBody } from '@/lib/services/slack/dtos';
import { localizeUtc } from '@/lib/utils/cron';
import { processError } from '@/lib/utils/errors';
import { interpolate } from '@/lib/utils/locale';
import { BotContext, botContext } from '@/middleware/bot-context';
import { zodValidator } from '@/middleware/zod-validator';


export const interactionsRoute = new Hono<BotContext>()
  .post(
    '/',
    zodValidator('form', ZInteractiveRequestBody),
    botContext(),
    async (c) => {
      const { bot, localized } = c.var;

      const {
        channelId,
        userId,
        actions,
        responseUrl,
      } = c.req.valid('form');

      const [action] = actions;

      switch (action.type) {
          case 'button': {
            if (action.actionId === 'cancel-schedule') {
              await cancelBotSchedule(c, bot.id, userId);

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

            const {
              utcCronTime,
              timeZone,
            } = await setBotSchedule(c, {
              channelId,
              userId,
              selectedTime,
              locale: bot.locale,
              jobId: bot.schedule?.jobId,
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
