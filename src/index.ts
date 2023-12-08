
import { Hono } from 'hono';
import bot from './lib/bot';
import db from './lib/db';
import lichess from './lib/lichess';
import slack from './lib/slack';
import {
  parseRegistrationRequest,
  parseSlashCommandRequest
} from './lib/slack/parsers';
import { HTTPException } from 'hono/http-exception';

const STATE = '' // what is this?

const app = new Hono();

/** 
 * Expose app info and registration button
 */
app.get('/', (c) => {
    /**
     * this returns a page with a link that has the 
     * client id and the /register href baked into
     * the href; on click, slack takes over the 
     * transaction and asks the user to approve the 
     * installation. on successful install, the provided
     * /register route should be called, with a temporary
     * code and a state signature
     */
    return c.text('Home')
  })

/** 
 * Process registration request
 */
app.post('/register', async (c) => {
    const body = await c.req.parseBody();
    const { code } = parseRegistrationRequest(body, STATE);

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
