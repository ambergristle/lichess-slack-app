import { Hono } from 'hono';
import lichess from '../lib/lichess';

const v1 = new Hono();

const auth = v1
  .get('/auth', (c) => c.text('auth'))
  .all((c) => c.text('Invalid method', 405));

const help = v1
  .get('/help', (c) => c.text('help'));

const puzzle = v1
  .get('/puzzle', async (c) => {
    const {
      puzzleUrl,
      puzzleThumbUrl,
    } = await lichess.fetchDailyPuzzle();

    return c.json({
      puzzleUrl,
      puzzleThumbUrl,
    });
  });

const setTime = v1
  .get('set-time', (c) => c.text('set-time'));

export default v1;
