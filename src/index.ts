
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import pug from 'pug';
import wretch from 'wretch';

import db from '@/lib/db';
import {
  AuthorizationError,
  KnownError,
  PersistenceError,
  ValidationError
} from '@/lib/errors';
import Lichess from '@/lib/lichess';
import Slack from '@/lib/slack';
import {
  parseRegistrationRequest,
  parseTimePickerData,
  parseSlashCommandData,
} from '@/lib/slack/parsers';

import {
  getScheduledTime,
  parseScheduleData,
} from '@/lib/tz';
import config from './config';

const app = new Hono();

const compileLandingPage = pug.compileFile('src/landing.pug')

/** 
 * Expose app info and registration button
 */
app.get('/', (c) => {

  /**
   * @todo localize
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept-Language
   */

  /** 
   * The registration url points to Slack, where users
   * can authorize this app. It includes a redirect uri
   * that will automatically return users to the /slack/register
   * route, along with a registration code
  */

  const landingPage = compileLandingPage({
    registrationHref: Slack.getOAuthRedirectUrl()
  })

  /** @todo return error page */
  return c.html(landingPage);
})
.all((c) => c.text('Invalid method', 405));

const slack = new Hono();

/** 
 * Process registration request
 * @todo
 */
slack.get('/register', async (c) => {
  try {
    const { code, state } = parseRegistrationRequest(c.req.query());
    if (state !== config.STATE) throw new AuthorizationError('Invalid Key')
  
    const bot = await Slack.registerBot(code);
    await db.addBot(bot)

    /** @todo return success page */
    return c.text('Success!');
  } catch (error) {
    console.error(error)
    /** @todo return error page */
    return c.text('error')
  }
})
.all((c) => c.text('Invalid method', 405));

const commands = new Hono();

/**
 * Verify slash command requests
 */
commands.use((c, next) => {
  try {
    const userAgent = c.req.headers.get('user-agent')

    if (!userAgent?.includes('Slackbot 1.0 (+https://api.slack.com/robots)')) {
      console.log('no slackbot')
    }
    
    const accept = c.req.headers.get('accept')

    if (!accept?.includes('application/json')) {
      console.log('no json')
    }

    const {
      timestampIsValid,
      signatureIsValid,
    } = Slack.verifyRequest(c.req.raw)
  
    if (!timestampIsValid) throw new AuthorizationError('Signature is expired or invalid');
    if (!signatureIsValid) throw new AuthorizationError('Signature is invalid');
  
    return next();
  } catch (cause) {
    if (cause instanceof AuthorizationError || cause instanceof ValidationError) {
      console.error(cause);
      const res = new Response("Unauthorized", {
        status: 403,
      });
  
      throw new HTTPException(401, { res });
    }

    throw cause;
  }
})

/** 
 * Get command details 
 */
commands.post('/help', async (c) => {
  return c.json(Slack.blocks.help());
}).all((c) => c.text('Invalid method', 405));

/** 
 * Get daily puzzle (screenshot + url)
 */
commands.post('/puzzle', async (c) => {
  const puzzleData = await Lichess.getDailyPuzzle();
  return c.json(Slack.blocks.puzzle(puzzleData));
}).all((c) => c.text('Invalid method', 405));

/** 
 * Set scheduled delivery time
 */
commands.post('/schedule/set', async (c) => {
  const body = parseTimePickerData(await c.req.parseBody())

  /** @todo move to bot? */
  const { hours, minutes } = parseScheduleData(body.selectedTime)

  const preferences = await Slack.getTimeZone(body.userId)
  // how do we actually want to do this?
  const scheduledTime = getScheduledTime(hours, minutes, preferences.tz)

  await db.scheduleBot(body.teamId, scheduledTime)

  const displayString = scheduledTime.toLocaleString('en-US', {
    timeZone: preferences.tz
  })

  /** @todo job */
  const message = `Your puzzle would have been scheduled at ${displayString}, but`
    + ' I haven\'t gotten that far yet'

  /** @todo blocks; error handling? */
  wretch(body.responseUrl)
    .post(Slack.blocks.replaceWithText(message))

  /** @todo response? */
  return c.text('ok')
}).all((c) => c.text('Invalid method', 405));

/** 
 * Get scheduled delivery time
 */
commands.post('/schedule', async (c) => {
  const body = parseSlashCommandData(await c.req.parseBody())
  const teamId = body.teamId;

  const botData = await db.getBot(teamId)
  if (!botData) throw new PersistenceError('Bot not found', {
    code: 'not_found',
    collection: 'bots',
    filter: { teamId },
  })

  const preferences = await Slack.getTimeZone(body.userId)

  const response = Slack.blocks.schedule({
    scheduledAt: botData.scheduledAt,
    timeZone: preferences.tz,
    locale: preferences.locale
  })

  return c.json(response);
}).all((c) => c.text('Invalid Method', 405));

slack.route('/commands', commands);

app.route('/slack', slack);

/** @todo slack blocks? */
app.notFound((c) => c.text('Not Found', 404));

// check headers.host? user-agent?
// is there an origin prop?

// switch on c.req.path & c.req.error?
// seems simpler to do in handler

// error block responses should be ephemeral
// string messages are ok

const logError = (error: unknown) => {
  if (error instanceof KnownError) {
    console.error(error.json())
  } else {
    console.error(error)
  }
}

app.onError((error, c) => {
  /** if error has already been processed, return response */
  if (error instanceof HTTPException) {
    return error.getResponse();
  }

  logError(error)

  /**
   * commands middleware has already handled requests that
   * don't come from slack; return slack blocks on service failure
   * @todo schedule/set is an edge case
   */
  if (commandPaths.includes(c.req.path)) {
    const errorMessage = errorMessages[c.req.path] ?? 'Something went wrong'
    return c.json(Slack.blocks.error(errorMessage));
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


const commandPaths = [
  '/slack/commands/help',
  '/slack/commands/puzzle',
  '/slack/commands/schedule',
  '/slack/commands/schedule/set'
];

const errorMessages: Record<typeof commandPaths[number], string> = {
  '/slack/commands/help': 'Failed to retrieve app documentation.',
  '/slack/commands/puzzle': 'The daily puzzle is currently unavailable.',
  '/slack/commands/schedule': 'Your scheduling preferences could not be retrieved.',
  '/slack/commands/schedule/set': 'Puzzle delivery could not be scheduled.'
}
