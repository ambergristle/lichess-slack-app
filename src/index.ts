
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

/** @todo does it make sense to do this out here? */
const compileLandingPage = pug.compileFile('src/landing.pug')

/** 
 * Expose app info and registration button
 */
app.get('/', (c) => {

  // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept-Language

  /** 
   * The registration url points to Slack, where users
   * can authorize this app. It includes a redirect uri
   * that will automatically return users to the /register
   * route, along with a registration code
  */

  const landingPage = compileLandingPage({
    registrationHref: Slack.getOAuthRedirectUrl()
  })

  /** @todo return error page? */
  return c.html(landingPage);
});

const slack = new Hono();

// user agent include browser names?
// accept text/html
// user-agent Slackbot 1.0 (+https://api.slack.com/robots)

/** 
 * Process registration request
 * @todo
 */
slack.get('/register', async (c) => {
  const { code, state } = parseRegistrationRequest(c.req.query());
  if (state !== config.STATE) throw new AuthorizationError('Invalid Key')

  const bot = await Slack.registerBot(code);
  await db.addBot(bot)

  /** @todo throw http error */

  // return success page
  return c.text('Success!');
})
.all((c) => c.text('Invalid method', 405)); // ?

const commands = new Hono();

/**
 * Verify slash command requests
 */
commands.use((c, next) => {
  try {
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

  /** @todo return slack blocks */
})

/** 
 * Get command details 
 */
commands.post('/help', async (c) => {
  return c.json(Slack.blocks.help());
});

/** 
 * Get daily puzzle (screenshot + url)
 */
commands.post('/puzzle', async (c) => {
  const puzzleData = await Lichess.getDailyPuzzle();
  return c.json(Slack.blocks.puzzle(puzzleData));
});

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
    .post(Slack.blocks.whatever(message))

  return c.text('ok')
})

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
});

slack.route('/commands', commands);

app.route('/slack', slack);

app.notFound((c) => c.text('404', 404));

app.onError((error, c) => {
  if (error instanceof HTTPException) {
    return error.getResponse();
  }

  // check headers.host? user-agent?
  // is there an origin prop?

  // switch on c.req.path & c.req.error?
  // seems simpler to do in handler

  // error block responses should be ephemeral
  // string messages are ok

  if (error instanceof KnownError) {
    console.error(error.json())

    const data = errorData[error.name];

    if (!data) return new Response('Something went wrong', {
      status: 500,
    });

    return new Response(data.message, {
      status: data.status,
    });
  }

  console.error(error)
  // get rid of this after dev
  return c.text(JSON.stringify(error), 500)
});

export default app;


const errorData: Record<string, { message: string; status: number }> = {
  'AuthorizationError': {
    message: 'Unauthorized',
    status: 403,
  },
  'SlackError': {
    message: 'We are unable to complete your request at this time',
    status: 500,
  }
}
