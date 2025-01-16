import { Hono } from 'hono';
import pug from 'pug';

import { slack } from './routes/slack';
import { register } from './routes/register';
import { generateOAuthRedirectUrl } from './lib/slack';
import config from './config';
import { logError } from './lib/utils';
import { getIsBrowser } from './lib/request';
import { createMiddleware } from 'hono/factory';
import { accepts } from 'hono/accepts';
import { HTTPException } from 'hono/http-exception';
import { localize } from './pug';

const compileErrorPage = pug.compileFile('./error.pug');
const compileLandingPage = pug.compileFile('./landing.pug');
const compileNotFoundPage = pug.compileFile('./404.pug');

// todo: invalid method

const app = new Hono()
  .post('/', async (c) => {
    console.log(await c.req.text());
    return c.text('hi');
  })
  .route('/register', register)
  .route('/slack', slack)
  /**
   * Expose app info and registration button
   * - The registration url points to Slack, where users
   * can authorize this app. It includes a redirect uri
   * that will automatically return users to the /slack/register
   * route, along with a registration code
   */
  .use('*', createMiddleware<{
    Variables: {
      locale: string;
      isBrowser: boolean;
    }
  }>(async (c, next) => {
    /** @todo accepts html? */

    const locale = accepts(c, {
      header: 'Accept-Language',
      supports: ['en', 'en-US'],
      default: 'en-US',
      // match
    });

    c.set('locale', locale);

    const isBrowser = getIsBrowser(c.req.raw.headers);
    c.set('isBrowser', isBrowser);
  }))
  .get('/', async (c) => {
    const { locale } = c.var;

    try {
      const landingPage = await localize(compileLandingPage, locale, {
        /** @todo this is effectively static */
        registrationHref: generateOAuthRedirectUrl(),
      });

      return c.html(landingPage);
    } catch (error) {
      logError(error);

      const errorPage = await localize(compileErrorPage, locale, {
        homeHref: config.BASE_URL,
      });

      return c.html(errorPage);
    }

  })
  .notFound(async (c) => {
    const { locale } = c.var;

    const isBrowser = getIsBrowser(c);

    if (isBrowser) {
      const notFoundPage = await localize(compileNotFoundPage, locale, {
        homeHref: config.BASE_URL,
      });

      return c.html(notFoundPage, 404);
    }

    return c.text('Not Found', 404);
  })
  .onError((error, c) => {
    console.error(error);

    /** if error has already been processed, return response */
    if (error instanceof HTTPException) {
      return error.getResponse();
    }

    logError(error);

    return c.json({ message: 'oops' }, 500);
  });

export default app;
