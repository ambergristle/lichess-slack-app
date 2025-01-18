import { Hono } from 'hono';

import { ErrorPage } from '@/lib/components/errors';
import { localizer } from '@/lib/middleware/localizer';
import { zodValidator } from '@/lib/middleware/zod-validator';
import { registerBot } from '@/lib/services/slack';
import { ZRegistrationRequest } from '@/lib/services/slack/schemas';


export const register = new Hono()
  /** Process registration request and render results */
  .get(
    '/',
    zodValidator('query', ZRegistrationRequest),
    localizer(),
    // async (c, next) => {
    //   const { state } = c.req.valid('query');

    //   if (state !== config.STATE) {
    //     throw new AuthorizationError('Invalid Key');
    //   }

    //   await next();
    // },
    async (c) => {
      const { code } = c.req.valid('query');

      /** @todo responseUrl, preferences? */
      const bot = await registerBot(code);
      await db.addBot(bot);

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
