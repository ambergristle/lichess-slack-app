import { Hono } from 'hono';
import wretch from 'wretch';
import { HTTPException } from 'hono/http-exception';

import { localizeUtc } from '@/lib/cron';
import { interpolate } from '@/lib/locale';
import { cancelBotSchedule, setBotSchedule } from '@/lib/schedule';
import { ZInteractiveRequestBody } from '@/lib/slack/dtos';
import { BotContext, botContext } from '@/middleware/bot-context';
import { zodValidator } from '@/middleware/zod-validator';


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

              // todo: error handling
              wretch(responseUrl)
                .post({
                  replace_original: true,
                  text: 'Your scheduled Daily Puzzle has been canceled!',
                })
                .res()
                .catch(console.error);
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

            // todo: error handling
            wretch(responseUrl)
              .post({
                replace_original: true,
                text: message,
              })
              .res()
              .catch(console.error);

            break;
          }
      }

      return c.body(null, 200);
    }
  )
  .notFound((c) => {
    const webhookUrl = c.var.bot?.webhookUrl;
    if (webhookUrl) {
      // todo: error handling
      wretch(webhookUrl)
        .post({
          response_type: 'ephemeral',
          text: 'Server Error: Update failed',
        })
        .res()
        .catch(console.error);
    }

    const exception = new HTTPException(404, { message: 'Not Found' });
    return exception.getResponse();
  })
  .onError((error, c) => {
    console.error(error);

    const message = error instanceof Error
      ? error.message
      : 'Something went wrong';

    const webhookUrl = c.var.bot?.webhookUrl;
    if (webhookUrl) {
      // todo: error handling
      wretch(webhookUrl)
        .post({
          response_type: 'ephemeral',
          text: message,
        })
        .res()
        .catch(console.error);
    }

    const exception = new HTTPException(500, { message: 'Server Error' });
    return exception.getResponse();
  });
