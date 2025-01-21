import { type Env, Hono } from 'hono';
import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import { jsxRenderer } from 'hono/jsx-renderer';
import { z } from 'zod';

import { ErrorPage } from '@/lib/components/errors';
import { Layout } from '@/lib/components/layout';
import { registerBot } from '@/lib/bot';
import { localizer } from '@/middleware/localizer';
import { zodValidator } from '@/middleware/zod-validator';
import { getEnvironmentVariable } from '@/lib/request';


export const ZRegistrationRequest = z.object({
  code: z.string(),
  state: z.string(),
}, { message: 'Recieved unprocessable request' });


export const register = new Hono()
  // todo: verify request
  /** Process registration request and render results */
  .get(
    '/',
    zodValidator('query', ZRegistrationRequest),
    createMiddleware<Env, '/', {
      out: {
        query: { state: string; };
      }
    }>(async (c, next) => {
      const { state } = c.req.valid('query');

      if (state !== getEnvironmentVariable(c, 'STATE')) {
        throw new HTTPException(401, {
          message: 'Unauthorized',
          cause: {
            code: 'invalid-state',
          },
        });
      }

      await next();
    }),
    localizer(),
    jsxRenderer(Layout),
    async (c) => {
      const { code } = c.req.valid('query');

      await registerBot(c, code);

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
    }
  )
  .onError((error, c) => {
    console.error(error);
    const message = error instanceof Error
      ? error.message
      : 'Server Error';

    return c.render(
      <ErrorPage
        heading={'Registration failed'}
        details={message}
      />
    );
  });
