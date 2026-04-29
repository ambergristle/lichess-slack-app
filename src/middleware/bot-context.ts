import { createMiddleware } from 'hono/factory';

import type { DB } from '@/lib/db';
import { getChannelLocale } from '@/lib/slack';
import { getLocalized } from '@/lib/utils/locale';
import type { Localized } from '@/locale/types';

export const botContext = <IncludeTZ extends boolean>() => {
  return createMiddleware<BotContext<IncludeTZ>, string, InteractionInput>(
    async (c, next) => {
      const { channelId } = c.req.valid('form');

      const { botId, locale } = await getChannelLocale(c.var.db, channelId);

      c.set('botId', botId);
      c.set('channelId', channelId);
      c.set('locale', locale);

      const localized = await getLocalized(locale);
      c.set('localized', localized);

      await next();
    }
  );
};

export type BotContext<IncludeTZ = false> = {
  Variables: {
    db: DB;
    botId: string;
    channelId: string;
    locale: string;
    localized: Localized;
    timeZone: IncludeTZ extends true ? string : undefined;
  }
};

type InteractionInput = {
  out: {
    form: {
      channelId: string;
      userId: string;
    };
  };
};
