import { createMiddleware } from 'hono/factory';

import { getBotContext } from '@/lib/bot';
import { getLocalized } from '@/lib/locale';
import { Localized } from '@/locale/types';

export type BotContext = {
  Variables: {
    localized: Localized;
    bot: {
      id: string;
      locale: string;
      webhookUrl: string;
      schedule: {
        jobId: string;
        cron: string;
        timeZone: string;
      } | null;
    }
  }
}

export const botContext = () => {
  return createMiddleware<
  BotContext,
  string,
  {
    out: {
      form: {
        channelId: string;
        userId: string;
      }
    }
  }
  >(async (c, next) => {
    const { channelId, userId } = c.req.valid('form');

    const bot = await getBotContext(c, channelId, userId);
    c.set('bot', bot);

    const localized = await getLocalized(bot.locale);
    c.set('localized', localized);

    await next();
  });
};
