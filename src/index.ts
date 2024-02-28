import { Hono } from 'hono';
import { accepts } from 'hono/accepts'
// import { cors } from 'hono/cors'
// import { csrf } from 'hono/csrf'
import { HTTPException } from 'hono/http-exception';
import { logger } from 'hono/logger'
import wretch from 'wretch';

import config from '@/config';

import db from '@/lib/db';
import {
  AuthorizationError,
  PersistenceError,
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
  fromCron,
  getIsBrowser,
  getLocalePreference,
  getValidCronTime,
  isDevRequest,
  localizeZonedTime,
  logError,
  toCron,
  zonedTimeToUtc,
} from '@/lib/utils';

import {
  compileErrorPage,
  compileLandingPage,
  compileNotFoundPage,
  compileRegistrationErrorPage,
  compileRegistrationOkPage,
  localize,
} from '@/pug';

const app = new Hono();

app.use('*', logger())

/** 
 * Expose app info and registration button
 * - The registration url points to Slack, where users
 * can authorize this app. It includes a redirect uri
 * that will automatically return users to the /slack/register
 * route, along with a registration code
 */
app.get('/', async (c) => {
  /** @todo accepts html? */
  const isBrowser = getIsBrowser(c.req.raw.headers);

  const locale = accepts(c, {
    header: 'Accept-Language',
    supports: ['en', 'en-US'],
    default: 'en-US'
    // match
  })

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

}).all((c) => c.text('Invalid method', 405));

const slack = new Hono();

/** 
 * Process registration request and display results
 */
slack.get('/register', async (c) => {
  const isBrowser = getIsBrowser(c.req.raw.headers);

  const locale = accepts(c, {
    header: 'Accept-Language',
    supports: ['en', 'en-US'],
    default: 'en-US'
    // match fn
  })

  try {
    const { code, state } = parseRegistrationRequest(c.req.query());
    if (state !== config.STATE) throw new AuthorizationError('Invalid Key');
  
    /** @todo responseUrl, preferences? */
    const bot = await Slack.registerBot(code);
    await db.addBot(bot);

    if (!isBrowser) return c.text('App registration succeeded!');

    const registrationOkPage = await localize(compileRegistrationOkPage, locale);
    return c.html(registrationOkPage);
    
  } catch (error) {
    logError(error);

    if (!isBrowser) return c.text('Error: Registration failed');

    const registrationErrorPage = await localize(compileRegistrationErrorPage, locale);
    return c.html(registrationErrorPage);
  }
}).all((c) => c.text('Invalid method', 405))

const commands = new Hono();

/**  
 * Verify slash command requests 
 */
commands.use('*', async (c, next) => {

  if (isDevRequest(c.req.raw.headers)) {
    return await next()
  }

  const userAgent = c.req.header('user-agent');
  if (!userAgent?.includes('Slackbot 1.0 (+https://api.slack.com/robots)')) {
    /** @todo */
    console.log('no slackbot');
  } else {
    console.log('slackbot')
  }

  const accept = c.req.header('accept');
  if (!accept?.includes('application/json')) {
    /** @todo */
    console.log('no accept')
  }

  const {
    timestampIsValid,
    signatureIsValid,
  } = Slack.verifyRequest(c.req.raw);

  if (!timestampIsValid) throw new AuthorizationError('Signature is expired or invalid');
  if (!signatureIsValid) throw new AuthorizationError('Signature is invalid');

  await next()
})

commands.use('*', async (_, next) => {
  console.log('context')
  await next()
})

/** 
 * Get command details
 */
commands.post('/help', async (c) => {
  const response = await Slack.blocks('en-US').help();
  return c.json(response);
}).all((c) => c.text('Invalid method', 405))

/** 
 * Get daily puzzle (screenshot + url) 
 */
commands.post('/puzzle', async (c) => {
  const puzzleData = await Lichess.getDailyPuzzle();

  const response = await Slack.blocks('en-US').puzzle(puzzleData);
  return c.json(response);
}).all((c) => c.text('Invalid method', 405));

/** 
 * Set scheduled delivery time
 */
commands.post('/schedule/set', async (c) => {
  const body = parseTimePickerData(await c.req.parseBody());
  const preferences = await Slack.getUserInfo(body.userId);

  const cronData = zonedTimeToUtc(body.selectedTime, preferences.tz)
  const cron = toCron(cronData);

  const { scheduleId } = await createSchedule({
    service: '/api/whatever', 
    cron,
    data: {}
  })

  /** @todo db retry */
  await db.scheduleBot(body.teamId, {
    scheduleId,
    cron,
  });

  const timeString = localizeZonedTime(cronData, preferences.tz, preferences.locale)
  const message = `The daily puzzle will now be delivered at ${timeString}`

  /** @todo response queue? */
  const response = Slack.blocks(preferences.locale)
    .replaceWithText(message)

  /** @todo blocks; error handling? */
  wretch(body.responseUrl)
    .post(response);

  /** @todo response? */
  return c.text('ok');
}).all((c) => c.text('Invalid method', 405));

/** Get and set scheduled delivery time */
commands.post('/schedule', async (c) => {
  const { teamId, userId } = parseSlashCommandData(await c.req.parseBody());

  const botData = await db.getBot(teamId);
  if (!botData) throw new PersistenceError('Bot not found', {
    code: 'not_found',
    collection: 'bots',
    filter: { teamId },
  });

  const preferences = await Slack.getUserInfo(userId);

  const scheduledAt = botData.cron
    ? fromCron(botData.cron)
    : undefined;

  const response = await Slack.blocks(preferences.locale).schedule({
    scheduledAt: getValidCronTime(scheduledAt),
    timeZone: preferences.tz,
  });

  return c.json(response);
}).all((c) => c.text('Invalid Method', 405));

slack.route('/commands', commands)

app.route('/slack', slack)

app.notFound(async (c) => {
  const locale = getLocalePreference(c.req.raw.headers);
  const isBrowser = getIsBrowser(c.req.raw.headers);

  if (isBrowser) {
    const notFoundPage = await localize(compileNotFoundPage, locale, {
      homeHref: config.BASE_URL,
    });

    return c.html(notFoundPage, 404);
  }

  return c.text('Not Found', 404);
});

const commandNames: Record<string, Command> = {
  '/slack/commands/help': 'help',
  '/slack/commands/puzzle': 'puzzle',
  '/slack/commands/schedule': 'schedule',
  '/slack/commands/schedule/set': 'set',
};

app.onError(async (error, c) => {
  /** if error has already been processed, return response */
  if (error instanceof HTTPException) {
    return error.getResponse();
  }

  logError(error);

  /**
   * commands middleware has already handled requests that
   * don't come from slack; return slack blocks on service failure
   * @todo unauth error response
   * @todo schedule/set is an edge case
   */
  if (Object.keys(commandNames).includes(c.req.path)) {
    const locale = getLocalePreference(c.req.raw.headers);
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

// export default { 
//   port: 3000, 
//   fetch: app.fetch, 
// } 
