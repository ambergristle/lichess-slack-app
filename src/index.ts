import { Hono } from 'hono';

import { slack } from './routes/slack';
import { register } from './routes/register';

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
  .get('/', async (c) => {
    /** @todo accepts html? */
    // const isBrowser = getIsBrowser(c.req.raw.headers);

    const locale = accepts(c, {
      header: 'Accept-Language',
      supports: ['en', 'en-US'],
      default: 'en-US',
      // match
    });

    try {
      const landingPage = await localize(compileLandingPage, locale, {
        /** @todo this is effectively static */
        registrationHref: Slack.getOAuthRedirectUrl(),
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
    const headers = c.req.raw.headers;
    const locale = getLocalePreference(headers);
    const isBrowser = getIsBrowser(headers);

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
