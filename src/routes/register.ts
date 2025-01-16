import config from '@/config';
import { AuthorizationError } from '@/lib/errors';
import { zodValidator } from '@/lib/middleware/zod-validator';
import { getIsBrowser } from '@/lib/utils/api';
import { Hono } from 'hono';
import { accepts } from 'hono/accepts';
import { createMiddleware } from 'hono/factory';
import { z } from 'zod';

// todo: invalid method

const ZRegistrationRequest = z.object({
  code: z.string(),
  state: z.literal(config.STATE),
});


export const register = new Hono()
  /** Process registration request and render results */
  .get(
    '/',
    createMiddleware<{
      Variables: {
        isBrowser: boolean;
        locale: string;
      }
    }>(async (c, next) => {
      const isBrowser = getIsBrowser(c.req.raw.headers);
      c.set('isBrowser', isBrowser);

      const locale = accepts(c, {
        header: 'Accept-Language',
        supports: ['en', 'en-US'],
        default: 'en-US',
      });
      c.set('locale', locale);

      await next();
    }),
    zodValidator('query', ZRegistrationRequest),
    async (c, next) => {
      const { state } = c.req.valid('query');

      if (state !== config.STATE) {
        throw new AuthorizationError('Invalid Key');
      }

      await next();
    },
    async (c) => {
      try {
        const { code } = c.req.valid('query');

        /** @todo responseUrl, preferences? */
        const bot = await Slack.registerBot(code);
        await db.addBot(bot);

        if (!c.var.isBrowser) {
          return c.text('App registration succeeded!');
        }

        const registrationOkPage = await localize(compileRegistrationOkPage, locale);
        return c.html(registrationOkPage);
      } catch (error) {
        logError(error);

        if (!isBrowser) return c.text('Error: Registration failed');

        const registrationErrorPage = await localize(compileRegistrationErrorPage, locale);
        return c.html(registrationErrorPage);
      }
    },
  );
