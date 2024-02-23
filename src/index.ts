
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import wretch from 'wretch';

import config from '@/config';
import db from '@/lib/db';
import {
  AuthorizationError,
  PersistenceError,
  ValidationError,
} from '@/lib/errors';
import Lichess from '@/lib/lichess';
import Slack from '@/lib/slack';
import {
  parseRegistrationRequest,
  parseTimePickerData,
  parseSlashCommandData,
} from '@/lib/slack/parsers';
import { Command } from '@/lib/slack/types';
import {
  getIsBrowser,
  logError,
  getLocalePreference
} from '@/lib/utils';

import {
  getScheduledTime,
  parseScheduleData,
} from '@/lib/tz';

import {
  compileErrorPage,
  compileLandingPage,
  compileNotFoundPage,
  compileRegistrationErrorPage,
  compileRegistrationOkPage,
  localize,
} from '@/pug';

const app = new Hono();

/** 
 * Expose app info and registration button
 */
app.get('/', async (c) => {
  const locale = getLocalePreference(c.req.headers)

  try {
    /** 
     * The registration url points to Slack, where users
     * can authorize this app. It includes a redirect uri
     * that will automatically return users to the /slack/register
     * route, along with a registration code
    */
    const landingPage = await localize(compileLandingPage, locale, {
      registrationHref: Slack.getOAuthRedirectUrl(),
    })

    return c.html(landingPage);
  } catch (error) {
    logError(error);

    const errorPage = await localize(compileErrorPage, locale, {
      homeHref: config.BASE_URL,
    })

    return c.html(errorPage);
  }
})
  .all((c) => c.text('Invalid method', 405));

const slack = new Hono();

/** Process registration request */
slack.get('/register', async (c) => {
  const locale = getLocalePreference(c.req.headers)
  const isBrowser = getIsBrowser(c.req.headers);

  try {
    const { code, state } = parseRegistrationRequest(c.req.query());
    if (state !== config.STATE) throw new AuthorizationError('Invalid Key');
  
    const bot = await Slack.registerBot(code);
    await db.addBot(bot);

    if (isBrowser) {
      const registrationOkPage = await localize(compileRegistrationOkPage, locale)
      return c.html(registrationOkPage);
    }

    return c.text('App registration succeeded!');
  } catch (error) {
    logError(error);

    if (isBrowser) {
      const registrationErrorPage = await localize(compileRegistrationErrorPage, locale)
      return c.html(registrationErrorPage);
    }

    return c.text('Error: Registration failed');
  }
})
  .all((c) => c.text('Invalid method', 405));

const commands = new Hono();

/**  Verify slash command requests */
commands.use((c, next) => {
  try {
    const userAgent = c.req.headers.get('user-agent');

    if (!userAgent?.includes('Slackbot 1.0 (+https://api.slack.com/robots)')) {
      console.log('no slackbot');
    }
    
    const accept = c.req.headers.get('accept');

    if (!accept?.includes('application/json')) {
      console.log('no json');
    }

    const {
      timestampIsValid,
      signatureIsValid,
    } = Slack.verifyRequest(c.req.raw);
  
    if (!timestampIsValid) throw new AuthorizationError('Signature is expired or invalid');
    if (!signatureIsValid) throw new AuthorizationError('Signature is invalid');
  
    return next();
  } catch (cause) {
    if (cause instanceof AuthorizationError || cause instanceof ValidationError) {
      console.error(cause);
      const res = new Response('Unauthorized', {
        status: 403,
      });
  
      throw new HTTPException(401, { res });
    }

    throw cause;
  }
});

/** Get command details  */
commands.post('/help', async (c) => {
  const locale = getLocalePreference(c.req.headers)
  return c.json(await Slack.blocks(locale).help());
}).all((c) => c.text('Invalid method', 405));

/** Get daily puzzle (screenshot + url) */
commands.post('/puzzle', async (c) => {
  const locale = getLocalePreference(c.req.headers)
  const puzzleData = await Lichess.getDailyPuzzle();
  return c.json(await Slack.blocks(locale).puzzle(puzzleData));
}).all((c) => c.text('Invalid method', 405));

/** Set scheduled delivery time */
commands.post('/schedule/set', async (c) => {
  const locale = getLocalePreference(c.req.headers)
  const body = parseTimePickerData(await c.req.parseBody());

  /** @todo move to bot? */
  const { hours, minutes } = parseScheduleData(body.selectedTime);

  const preferences = await Slack.getTimeZone(body.userId);
  // how do we actually want to do this?
  const scheduledTime = getScheduledTime(hours, minutes, preferences.tz);

  await db.scheduleBot(body.teamId, scheduledTime);

  const displayString = scheduledTime.toLocaleString(locale, {
    timeZone: preferences.tz,
  });

  /** @todo job */
  const message = `Your puzzle would have been scheduled at ${displayString}, but`
    + ' I haven\'t gotten that far yet';

  /** @todo blocks; error handling? */
  wretch(body.responseUrl)
    .post(await Slack.blocks(locale).replaceWithText(message));

  /** @todo response? */
  return c.text('ok');
}).all((c) => c.text('Invalid method', 405));

/** 
 * Get scheduled delivery time
 */
commands.post('/schedule', async (c) => {
  const locale = getLocalePreference(c.req.headers)
  const body = parseSlashCommandData(await c.req.parseBody());
  const teamId = body.teamId;

  const botData = await db.getBot(teamId);
  if (!botData) throw new PersistenceError('Bot not found', {
    code: 'not_found',
    collection: 'bots',
    filter: { teamId },
  });

  const preferences = await Slack.getTimeZone(body.userId);

  const response = await Slack.blocks(locale).schedule({
    scheduledAt: botData.scheduledAt,
    timeZone: preferences.tz,
    locale: preferences.locale,
  });

  return c.json(response);
}).all((c) => c.text('Invalid Method', 405));

slack.route('/commands', commands);

app.route('/slack', slack);

app.notFound(async (c) => {
  const locale = getLocalePreference(c.req.headers)
  const isBrowser = getIsBrowser(c.req.headers);

  if (isBrowser) {
    const notFoundPage = await localize(compileNotFoundPage, locale, {
      homeHref: config.BASE_URL,
    })

    return c.html(notFoundPage, 404);
  }

  return c.text('Not Found', 404);
});

const commandNames: Record<string, Command> = {
  '/slack/commands/help': 'help',
  '/slack/commands/puzzle': 'puzzle',
  '/slack/commands/schedule': 'schedule',
  '/slack/commands/schedule/set': 'set',
}

app.onError(async (error, c) => {
  /** if error has already been processed, return response */
  if (error instanceof HTTPException) {
    return error.getResponse();
  }

  logError(error);

  /**
   * commands middleware has already handled requests that
   * don't come from slack; return slack blocks on service failure
   * @todo schedule/set is an edge case
   */
  if (Object.keys(commandNames).includes(c.req.path)) {
    const locale = getLocalePreference(c.req.headers)
    return c.json(await Slack.blocks(locale).error(commandNames[c.req.path]));
  }

  if (error instanceof AuthorizationError) {
    return new Response('Unauthorized', {
      status: 403,
    });
  }

  return new Response('Something went wrong', {
    status: 500,
  });
});

export default app;
