import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';

import config from '@/config';
import { ErrorPage } from '@/lib/components/errors';
import { localizer } from '@/lib/middleware/localizer';
import { zodValidator } from '@/lib/middleware/zod-validator';
import { registerBot } from '@/lib/services/bot';
import { ZRegistrationRequest } from '@/lib/services/slack/schemas';
import { jsxRenderer } from 'hono/jsx-renderer';
import { Layout } from '@/lib/components/layout';
import { createMiddleware } from 'hono/factory';


export const register = new Hono()
  /** Process registration request and render results */
  .get(
    '/',
    zodValidator('query', ZRegistrationRequest),
    createMiddleware<{ 
      Variables: {}
    }, '/', {
      out: {
        query: { state: string; };
      }
    }>(async (c, next) => {
      const { state } = c.req.valid('query');

      if (state !== config.STATE) {
        throw new HTTPException(401, {
          message: 'Unauthorized',
          cause: {
            code: 'invalid-state'
          }
        });
      }

      await next()
    }),
    localizer(),
    jsxRenderer(Layout),
    async (c) => {
      const { code } = c.req.valid('query');

      // todo: responseUrl, preferences?
      await registerBot(code);

      const { localized } = c.var;
      return c.render(
        <div>
          <h1>
            {localized.registrationSucceeded}
          </h1>
          <p>
            {localized.closeWindowPrompt}
          </p>
        </div>
      );
    },
  )
  .onError((error, c) => {
    const message = error instanceof Error
      ? error.message
      : 'Server Error';

    return c.render(
      <ErrorPage
        heading={'Registration failed'}
        details={message}
      />,
    );
  });
