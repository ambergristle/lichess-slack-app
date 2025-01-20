import { getBotContext } from '@/lib/services/bot';
import { createMiddleware } from 'hono/factory';
import { Bot } from '../types';

export const botContext = () => {
  return createMiddleware<{
    Variables: {
      locale: string;
      bot: {
        teamId: string;
        userId: string;
        schedule: Bot['schedule'];
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

    const botContext = await getBotContext(teamId, userId)

    c.set('bot', botContext);

    await next();
  });
};
