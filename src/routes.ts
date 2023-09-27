import { Hono } from 'hono';
import db from './lib/db'
import lichess from './lib/lichess';
import bot  from './lib/bot';
import { parseRegistrationRequest, parseSlashCommandRequest } from './lib/slack/parsers';

const STATE = '' // what is this?

const v1 = new Hono();

/** 
 * Expose app info and registration button
 * @todo jsx 
 * @todo redirect instead?
 */
const home = v1
  .get('/', (c) => {
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
 * @todo state 
 */
const register = v1
  .post('/register', async (c) => {
    const body = await c.req.parseBody();
    const { code } = parseRegistrationRequest(body, STATE); // curry?

    await bot.register({
      code,
      createBotAccount: db.createBot,
    })

    // redirect somewhere? return stuff?
    return c.text('Success!');
  })
  .all((c) => c.text('Invalid method', 405)); // ?

/** 
 * Post command details 
 * @todo check creds/whatever
 * @todo update db?
 */
const help = v1
  .post('/help', async (c) => {
    const response = bot.commands.help();
    return c.json(response);
  });

/** 
 * Post daily puzzle  
 * @todo check creds/whatever
 * @todo update db?
 */
const puzzle = v1
  .post('/puzzle', async (c) => {
    const response = await bot.commands.puzzle({ 
      fetchDailyPuzzle: lichess.fetchDailyPuzzle
     });
    return c.json(response);
  });

/** 
 * Get or set scheduled delivery
 * @todo check creds/whatever
 * @todo update db?
 * @todo work out multi-step?
 */
const schedule = v1
  .post('/schedule', async (c) => {
    const body = await c.req.parseBody();
    const data = parseSlashCommandRequest(body);

    return c.text(`schedule ${data.text}`);
  });

export default v1;