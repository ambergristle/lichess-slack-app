import { createMiddleware } from 'hono/factory';

import { getBotContext } from '@/lib/bot';
import { getLocalized } from '@/lib/locale';
import { Localized } from '@/locale/types';

export type BotContext = {
  Variables: {
    localized: Localized;
    bot: {
      id: string;
      teamId: string;
      userId: string;
      locale: string;
      schedule?: {
        jobId: string;
        cron: string;
        timeZone: string;
      }
      webhookUrl: string;
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
        teamId: string;
        userId: string;
      }
    }
  }
  >(async (c, next) => {
    const { teamId, userId } = c.req.valid('form');

    const bot = await getBotContext(c, teamId, userId);
    c.set('bot', bot);

    const localized = await getLocalized(bot.locale);
    c.set('localized', localized);

    await next();
  });
};
