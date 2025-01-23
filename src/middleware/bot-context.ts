import { createMiddleware } from 'hono/factory';

import { generatBotId, getBotSchedule } from '@/lib/entities/bot';
import { getLocalized } from '@/lib/utils/locale';
import { Localized } from '@/locale/types';
import { generateScheduleId } from '@/lib/entities/schedule';
import { getChannelLocale } from '@/lib/services/slack';

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

    const botId = generatBotId(channelId);
    const scheduleId = generateScheduleId(botId, userId);

    const {
      schedule,
      webhookUrl,
    } = await getBotSchedule(c, botId, scheduleId);

    const locale = await getChannelLocale(c, botId, channelId);

    c.set('bot', {
      id: botId,
      locale,
      schedule: schedule,
      webhookUrl: webhookUrl,
    });

    const localized = await getLocalized(locale);
    c.set('localized', localized);

    await next();
  });
};
