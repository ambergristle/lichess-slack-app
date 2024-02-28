import { Hono } from 'hono';
import { accepts } from 'hono/accepts';
// import { cors } from 'hono/cors'
// import { csrf } from 'hono/csrf'
import { HTTPException } from 'hono/http-exception';
import { logger } from 'hono/logger';
import wretch from 'wretch';

import config from '@/config';
import { getBotContext } from '@/controllers';

import { createSchedule, verifyRequest } from '@/lib/cron';
import db from '@/lib/db';
import {
  AuthorizationError,
  PersistenceError,
} from '@/lib/errors';
import * as Lichess from '@/lib/lichess';
import * as Slack from '@/lib/slack';
import {
  parseRegistrationRequest,
  parseTimePickerData,
  parseSlashCommandData,
} from '@/lib/slack/parsers';
import { Command } from '@/lib/slack/types';
import {
  getIsBrowser,
  getLocalePreference,
  localizeZonedTime,
  logError,
  toCron,
  utcTimeToZoned,
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
import { ScheduledPuzzleData, parseScheduledPuzzleData } from './dtos';

const app = new Hono();

app.use('*', logger());

/** 
 * Expose app info and registration button
 * - The registration url points to Slack, where users
 * can authorize this app. It includes a redirect uri
 * that will automatically return users to the /slack/register
 * route, along with a registration code
 */
app.get('/', async (c) => {
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
    default: 'en-US',
  });

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
}).all((c) => c.text('Invalid method', 405));

const commands = new Hono();

/**  
 * Verify slash command requests 
 */
commands.use('*', async (c, next) => {
  const userAgent = c.req.header('user-agent');
  if (!userAgent?.includes('Slackbot 1.0 (+https://api.slack.com/robots)')) {
    /** @todo */
    console.log('no slackbot');
  }

  const accept = c.req.header('accept');
  if (!accept?.includes('application/json')) {
    /** @todo */
    console.log('no accept');
  }

  // excludes files and other possible FormData
  const formData = await c.req.formData();
  const dataEntries = [...formData.entries()]
    .reduce((entries, [key, value]) => {
      if (typeof value === 'string') entries.push([key, value]);
      return entries;
    }, [] as string[][]);

  const {
    timestampIsValid,
    signatureIsValid,
  } = Slack.verifyRequest({
    headers: c.req.raw.headers.toJSON(),
    body: new URLSearchParams(dataEntries).toString(),
  });

  if (!timestampIsValid) throw new AuthorizationError('Signature is expired or invalid');
  if (!signatureIsValid) throw new AuthorizationError('Signature is invalid');

  await next();
});

/** 
 * Get command details
 */
commands.post('/help', async (c) => {
  const body = await c.req.parseBody();
  const { teamId, userId } = parseSlashCommandData(body);

  const { locale } = await getBotContext(teamId, userId);

  const response = await Slack.blocks(locale).help();
  return c.json(response);
}).all((c) => c.text('Invalid method', 405));

/** 
 * Get daily puzzle (screenshot + url) 
 */
commands.post('/puzzle', async (c) => {
  const body = await c.req.parseBody();
  const { teamId, userId } = parseSlashCommandData(body);

  const { locale } = await getBotContext(teamId, userId);

  const puzzleData = await Lichess.getDailyPuzzle();

  const response = await Slack.blocks(locale).puzzle(puzzleData);
  return c.json(response);
}).all((c) => c.text('Invalid method', 405));

/** 
 * Set scheduled delivery time
 */
commands.post('/schedule/set', async (c) => {
  const body = await c.req.parseBody();
  const {
    teamId,
    userId,
    selectedTime,
    responseUrl,
  } = parseTimePickerData(body);

  const { locale, timeZone } = await getBotContext(teamId, userId);

  const cronData = zonedTimeToUtc(selectedTime, timeZone);
  const cron = toCron(cronData);

  const data: ScheduledPuzzleData = {
    uid: teamId,
    locale,
  };

  const { scheduleId } = await createSchedule({
    service: '/api/deliver', 
    cron,
    data,
  });

  /** @todo db retry or session */
  await db.scheduleBot(teamId, {
    scheduleId,
    cron,
  });

  const timeString = localizeZonedTime(selectedTime, timeZone, locale);
  /** @todo locale */
  const message = `The daily puzzle will now be delivered at ${timeString}`;

  /** @todo response queue? */
  const response = Slack.blocks(locale)
    .replaceWithText(message);

  /** @todo blocks; error handling? webhook url */
  wretch(responseUrl).post(response);

  /** @todo response? */
  return c.text('ok');
}).all((c) => c.text('Invalid method', 405));

/** 
 * Get and set scheduled delivery time 
 */
commands.post('/schedule', async (c) => {
  const body = await c.req.parseBody();
  const { teamId, userId } = parseSlashCommandData(body);

  const { locale, timeZone, ...bot } = await getBotContext(teamId, userId);

  const scheduledAt = bot.getScheduledAt();

  const response = await Slack.blocks(locale).schedule({
    scheduledAt: scheduledAt
      ? utcTimeToZoned(scheduledAt, timeZone)
      : undefined,
    timeZone,
  });

  return c.json(response);
}).all((c) => c.text('Invalid Method', 405));

slack.route('/commands', commands);

app.route('/slack', slack);

const cron = new Hono();

cron.use(async (c, next) => {
  // upstash-schedule-id
  const token = c.req.header('upstash-signature');
  
  const arrayBuffer = await c.req.arrayBuffer();
  c.req.bodyCache.arrayBuffer = arrayBuffer;

  const body = await new Response(arrayBuffer).text();
  verifyRequest(c.req.path, body, token);

  await next();
});

/**
 * Dispatch scheduled puzzle delivery
 */
cron.post('/deliver', async (c) => {
  const body = await c.req.json();
  const { uid: teamId, locale } = parseScheduledPuzzleData(body);
  
  const bot = await db.getBot(teamId);
  if (!bot) throw new PersistenceError('Bot not found', {
    code: 'not_found',
    collection: 'bots',
    op: 'read',
    filter: { teamId },
  });

  const puzzleData = await Lichess.getDailyPuzzle();

  const response = await Slack.blocks(locale).puzzle(puzzleData);
  wretch(bot.webhookUrl).post(response);

  /** @todo response? */
  return c.text('ok');
}).all((c) => c.text('Invalid Method', 405));

app.route('/cron', cron);

app.notFound(async (c) => {
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
  const path = c.req.path;
  if (Object.keys(commandNames).includes(path)) {
    const locale = getLocalePreference(c.req.raw.headers);
    return c.json(await Slack.blocks(locale).error(commandNames[path]));
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
