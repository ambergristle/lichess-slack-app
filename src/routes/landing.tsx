import { Hono } from 'hono';
import { jsxRenderer } from 'hono/jsx-renderer';

import { ErrorPage } from '@/lib/components/errors';
import { Layout } from '@/lib/components/layout';
import { generateOAuthRedirectUrl } from '@/lib/services/slack';
import { localizer } from '@/middleware/localizer';
import { globalRateLimiter } from '@/middleware/rate-limiter';
import { processError } from '@/lib/utils/errors';


const REPO_URL = 'https://github.com/ambergristle/lichess-slack-app';

/**
 * Expose app info and registration button
 * - The registration url points to Slack, where users
 * can authorize this app. It includes a redirect uri
 * that will automatically return users to the /slack/register
 * route, along with a registration code
 */
export const landingRoute = new Hono()
  .use(globalRateLimiter())
  .get(
    '/',
    localizer(),
    jsxRenderer(Layout),
    async (c) => {
      const { localized } = c.var;

      const registrationHref = generateOAuthRedirectUrl(c);

      return c.render(
        <div>
          <h1>
            {localized.appName}
          </h1>
          <p>
            {localized.appDescription}
          </p>
          <a href={registrationHref} class="register-button">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              style="height: 20px; width: 20px; margin-right: 12px"
              viewBox="0 0 122.8 122.8"
            >
              <path
                d="M25.8 77.6c0 7.1-5.8 12.9-12.9 12.9S0 84.7 0 77.6s5.8-12.9 12.9-12.9h12.9v12.9zm6.5 0c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9v32.3c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V77.6z"
                fill="#e01e5a"
              />
              <path
                d="M45.2 25.8c-7.1 0-12.9-5.8-12.9-12.9S38.1 0 45.2 0s12.9 5.8 12.9 12.9v12.9H45.2zm0 6.5c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H12.9C5.8 58.1 0 52.3 0 45.2s5.8-12.9 12.9-12.9h32.3z"
                fill="#36c5f0"
              />
              <path
                d="M97 45.2c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9-5.8 12.9-12.9 12.9H97V45.2zm-6.5 0c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V12.9C64.7 5.8 70.5 0 77.6 0s12.9 5.8 12.9 12.9v32.3z"
                fill="#2eb67d"
              />
              <path
                d="M77.6 97c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9-12.9-5.8-12.9-12.9V97h12.9zm0-6.5c-7.1 0-12.9-5.8-12.9-12.9s5.8-12.9 12.9-12.9h32.3c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H77.6z"
                fill="#ecb22e"
              />
            </svg>
            {localized.addToSlack}
          </a>
          <p class="text-small">
            {`${localized.sourceCode}:`}&nbsp;
            <a
              href={REPO_URL}
              target="_blank"
            >
              {REPO_URL}
            </a>
          </p>
        </div>
      );
    })
  .onError((error, c) => {
    const { status, message } = processError(error);

    return c.render(
      <ErrorPage
        heading={'Server Error'}
        details={message}
      />
    );
  });

