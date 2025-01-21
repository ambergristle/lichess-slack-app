import { Hono } from 'hono';
import { logger } from 'hono/logger';

import * as routes from './routes';


// todo: invalid method

const app = new Hono()
  .use(logger())
  .route('/webhooks/scheduled-puzzle', routes.webhooks.scheduledPuzzle)
  .route('/webhooks/slack', routes.webhooks.slack)
  .route('/', routes.landing)
  .route('/register', routes.register);
  // .notFound()
  // .onError();

export default app;
