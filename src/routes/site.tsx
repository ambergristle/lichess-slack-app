import { Hono } from 'hono';
import { serveStatic } from 'hono/bun';
import { jsxRenderer } from 'hono/jsx-renderer';

import config from '@/config';
import { ErrorView } from '@/lib/components/errors';
import { Layout } from '@/lib/components/layout';
import { registerBot } from '@/lib/db/queries/bot';
import {
  exchangeCodeGrant,
  generateAuthorizationUrl,
  validateRegistrationRequest,
} from '@/lib/slack';
import { processError } from '@/lib/utils/errors';
import { dbProvider } from '@/middleware/db-provider';
import { localizer } from '@/middleware/localizer';


export const site = new Hono()
  // .use(globalRateLimiter())
  .use(localizer())
  .use(jsxRenderer(Layout))
  .get('/public/*', serveStatic({
    root: './',
  }))
  /**
   * Simple landing page to facilitate registration, and
   * link to docs and privacy info.
   */
  .get('/', (c) => {
    const { localized } = c.var;
    const registrationHref = generateAuthorizationUrl(c);

    const repoUrl = 'https://github.com/ambergristle/lichess-slack-app';

    return c.render(
      <div>
        <h1>
          {localized.appName}
        </h1>
        <p>
          {localized.appDescription}
        </p>
        <a href={registrationHref} class="register-button">
          <img
            src="/public/assets/slack/slack-logo.svg"
            height="16"
            width="16"
            alt="Slack logo"
          />
          {localized.addToSlack}
        </a>
        <p class="text-small">
          {`${localized.sourceCode}:`}&nbsp;
          <a href={repoUrl} target="_blank">
            {repoUrl}
          </a>
        </p>
      </div>
    );
  })
  /**
   * Complete OAuth code exchange and register bot if successful.
   */
  .get(
    '/register',
    validateRegistrationRequest(),
    dbProvider(),
    async (c) => {
      const { code } = c.req.valid('query');

      const grant = await exchangeCodeGrant(c, code);
      await registerBot(c.var.db, grant);

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
    })
  .notFound((c) => {
    // todo: respect accepts?
    return c.render(
      <ErrorView
        heading={'404'}
        details={'We couldn\'nt find what you were looking for.'}
      />
    );
  })
  .onError((error, c) => {
    // todo: respect accepts?
    const { status, message } = processError(error);

    return c.render(
      <ErrorView
        heading={'Error'}
        details={message}
      />
    );
  });
