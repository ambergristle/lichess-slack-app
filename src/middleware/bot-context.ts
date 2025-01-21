import { createMiddleware } from 'hono/factory';

import { getBotContext } from '@/lib/bot';
import { getLocalized } from '@/lib/locale';
import { Localized } from '@/locale/types';


export const botContext = () => {
  return createMiddleware<
  {
    Variables: {
      localized: Localized;
      bot: {
        id: string;
        teamId: string;
        locale: string;
        schedule?: {
          jobId: string;
          cron: string;
          timeZone: string;
        }
      }
    }
  },
  string,
  {
    out: {
      form: {
        // this isn't quite going to work
        teamId: string;
      }
    }
  }
  >(async (c, next) => {
    const { teamId } = c.req.valid('form');

    const bot = await getBotContext(c, teamId);
    c.set('bot', bot);

    const localized = await getLocalized(bot.locale);
    c.set('localized', localized);

    await next();
  });
};
