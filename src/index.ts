
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import pug from 'pug';
import wretch from 'wretch';

import db from '@/lib/db';
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
import { PersistenceError } from './lib/errors';

const app = new Hono();

/** @todo does it make sense to do this out here? */
const compileLandingPage = pug.compileFile('src/landing.pug')

/** 
 * Expose app info and registration button
 */
app.get('/', (c) => {

  /** 
   * The registration url points to Slack, where users
   * can authorize this app. It includes a redirect uri
   * that will automatically return users to the /register
   * route, along with a registration code
  */

  const landingPage = compileLandingPage({
    registrationHref: Slack.getOAuthRedirectUrl()
  })

  // general error handling
  return c.html(landingPage);
});

/** 
 * Process registration request
 * @todo
 */
app.post('/register', async (c) => {
  const body = await c.req.parseBody();
  const { code } = parseRegistrationRequest(body);

  const bot = await Slack.registerBot(code);
  await db.addBot(bot)

  // redirect somewhere? return stuff?
  return c.text('Success!');
})
.all((c) => c.text('Invalid method', 405)); // ?

const v1 = new Hono();

/**
 * Verify slash command requests
 */
v1.use((c, next) => {
  const {
    timestampIsValid,
    signatureIsValid,
  } = Slack.verifyRequest(c.req.raw)

  if (!timestampIsValid || !signatureIsValid) {
    const res = new Response("Unauthorized", {
      status: 401,
    });

    throw new HTTPException(401, { res });
  }

  return next();
})

/** 
 * Get command details 
 */
v1.post('/help', async (c) => {
  return c.json(Slack.blocks.help());
});

/** 
 * Get daily puzzle (screenshot + url)
 */
v1.post('/puzzle', async (c) => {
  const puzzleData = await Lichess.getDailyPuzzle();
  return c.json(Slack.blocks.puzzle(puzzleData));
});

/** 
 * Set scheduled delivery time
 */
v1.post('/schedule/set', async (c) => {
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
v1.post('/schedule', async (c) => {
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

app.route('/slack', v1);

app.notFound((c) => c.text('404', 404));

app.onError((error, c) => c.text(JSON.stringify(error), 500));

export default app;
