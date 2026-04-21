import { createMiddleware } from 'hono/factory';

import { getLocalized } from '@/lib/utils/locale';
import { Localized } from '@/locale/types';
import { getBotContext } from '@/lib/slack';
import { DB } from '@/lib/db';


export const botContext = () => {
  return createMiddleware<BotContext, string, InteractionInput>(
    async (c, next) => {
      const { channelId } = c.req.valid('form');

      const { botId, locale } = await getBotContext(c.var.db, channelId);
      c.set('botId', botId);
      c.set('channelId', channelId);
      c.set('locale', locale);

      const localized = await getLocalized(locale);
      c.set('localized', localized);

      await next();
    }
  );
};

export type BotContext = {
  Variables: {
    db: DB;
    botId: string;
    channelId: string;
    locale: string;
    localized: Localized;
  }
}

type InteractionInput = {
  out: {
    form: {
      channelId: string;
      userId: string;
    }
  }
}
