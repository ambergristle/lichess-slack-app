import { Hono } from 'hono';

const v1 = new Hono();

const auth = v1
  .get('/auth', (c) => c.text('auth'));

const help = v1
  .get('/help', (c) => c.text('help'));

const puzzle = v1
  .get('/puzzle', (c) => c.text('puzzle'));

const setTime = v1
  .get('set-time', (c) => c.text('set-time'));

export default v1;
