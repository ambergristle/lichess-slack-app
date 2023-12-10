
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import pug from 'pug';
import wretch from 'wretch';

import bot from '@/lib/bot';
import db from '@/lib/db';
import lichess from '@/lib/lichess';
import slack from '@/lib/slack';
import {
  parseTimePickerAction,
  parseRegistrationRequest,
  parseSlashCommandRequest,
} from '@/lib/slack/parsers';
import { getScheduledTime, parseScheduleArguments } from '@/lib/tz';

import config from '@/config'

const app = new Hono();

const compileLandingPage = pug.compileFile('src/landing.pug')

/** 
 * Expose app info and registration button
 * @todo
 */
app.get('/', (c) => {

  /** 
   * The registration url points to Slack, where users
   * can authorize this app. It includes a redirect uri
   * that will automatically return users to the /register
   * route, along with a registration code
  */

  const landingPage = compileLandingPage({
    registrationHref: slack.getOAuthRedirectUrl(config.STATE)
  })

  return c.html(landingPage);
});

/** 
 * Process registration request
 * @todo
 */
app.post('/register', async (c) => {
  const body = await c.req.parseBody();
  const { code } = parseRegistrationRequest(body, config.STATE);

  const bot = await slack.registerBot(code);
  await db.addBot(bot)

  // redirect somewhere? return stuff?
  return c.text('Success!');
})
.all((c) => c.text('Invalid method', 405)); // ?

const v1 = new Hono();

v1.use((c, next) => {
  const {
    timestampIsValid,
    signatureIsValid,
  } = slack.verifyRequest(c.req.raw)

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
  return c.json(bot.responses.help());
});

/** 
 * Get daily puzzle (screenshot + url)
 */
v1.post('/puzzle', async (c) => {
  const puzzleData = await lichess.fetchDailyPuzzle();
  return c.json(bot.responses.puzzle(puzzleData));
});

v1.post('/schedule/set', async (c) => {
  const body = parseTimePickerAction(await c.req.parseBody())

  /** @todo move to bot? */
  const { hours, minutes } = parseScheduleArguments(body.selectedTime)

  const preferences = await slack.getTimeZone(body.userId)
  const scheduledTime = getScheduledTime(hours, minutes, preferences.tz)

  await db.scheduleBot(body.teamId, scheduledTime)

  const displayString = scheduledTime.toLocaleString('en-US', {
    timeZone: preferences.tz
  })

  /** @todo blocks */
  wretch(body.responseUrl).post({
    replace_original: true,
    text: `Your puzzle would have been scheduled at ${displayString}, but`
      + ' I haven\'t gotten that far yet'
  }, )

  return c.text('ok')
})

/** 
 * Get or set scheduled delivery time
 */
v1.post('/schedule', async (c) => {
  const body = parseSlashCommandRequest(await c.req.parseBody())

  const botData = await db.getBot(body.teamId)
  if (!botData) throw new Error('Bot could not be found')

  const preferences = await slack.getTimeZone(body.userId)
  const blocks = bot.responses
    .schedule(botData.scheduledAt, preferences.tz)

  return c.json(blocks);
});

app.route('/slack', v1);

app.notFound((c) => c.text('404', 404));

app.onError((error, c) => c.text(JSON.stringify(error), 500));

export default app;
