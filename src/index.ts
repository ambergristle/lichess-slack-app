
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import pug from 'pug';

import bot from './lib/bot';
import db from './lib/db';
import lichess from './lib/lichess';
import slack from './lib/slack';
import {
  parseRegistrationRequest,
  parseSlashCommandRequest
} from './lib/slack/parsers';

import config from './config'

const app = new Hono();

const compileLandingPage = pug.compileFile('./landing.pug')

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
    registrationHref: slack.getOAuthRedirectUrl(config.STATE)
  })

  return c.html(landingPage);
});

/** 
 * Process registration request
 */
app.post('/register', async (c) => {
  const body = await c.req.parseBody();
  const { code } = parseRegistrationRequest(body, config.STATE);

  const bot = await slack.registerBot(code);
  await db.createBot(bot)

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
  return c.json(bot.help());
});

/** 
 * Get daily puzzle (screenshot + url)
 */
v1.post('/puzzle', async (c) => {
  const puzzleData = await lichess.fetchDailyPuzzle();
  return c.json(bot.puzzle(puzzleData));
});

/** 
 * Get or set scheduled delivery time
 * @todo
 */
v1.post('/schedule', async (c) => {
  // we can probably do more here
  const body = parseSlashCommandRequest(c.req.body)
  await db.scheduleBotByTeamId(body.teamId, new Date())
  return c.text(`schedule ${body.text}`);
});

app.route('/slack', v1);

app.notFound((c) => c.text('404', 404));

app.onError((error, c) => c.text(JSON.stringify(error), 500));

export default app;
