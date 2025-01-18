import { getBotContext } from '@/lib/services/bot';
import { createMiddleware } from 'hono/factory';

export const botContext = () => {
  return createMiddleware<{
    Variables: {
      locale: string;
      bot: {
        teamId: string;
        userId: string;
      }
    },
  }, string, {
    out: {
      form: {
        teamId: string;
        userId: string;
      }
    }
  }>(async (c, next) => {
    const { teamId, userId } = c.req.valid('form');
    const bot = await getBotContext(teamId, userId);

    c.set('locale', bot.locale);
    c.set('bot', {
      teamId,
      userId,
    });

    await next();
  });
};
