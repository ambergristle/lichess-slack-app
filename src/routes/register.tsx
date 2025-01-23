import { type Env, Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import { createMiddleware } from 'hono/factory';
import { jsxRenderer } from 'hono/jsx-renderer';
import { z } from 'zod';

import { ErrorPage } from '@/lib/components/errors';
import { Layout } from '@/lib/components/layout';
import { registerBot } from '@/lib/entities/bot';
import { OAUTH_STATE_COOKIE_NAME } from '@/lib/services/slack/config';
import { ZRegistrationRequest } from '@/lib/services/slack/dtos';
import { AuthorizationError, processError } from '@/lib/utils/errors';
import { localizer } from '@/middleware/localizer';
import { zodValidator } from '@/middleware/zod-validator';


export const registerRoute = new Hono()
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

      const stateCookie = getCookie(c, OAUTH_STATE_COOKIE_NAME);
      if (stateCookie !== state) {
        throw new AuthorizationError('Invalid Slack State');
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
    const { status, message } = processError(error);

    return c.render(
      <ErrorPage
        heading={'Registration Failed'}
        details={message}
      />
    );
  });
