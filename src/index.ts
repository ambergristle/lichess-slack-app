import { Hono } from 'hono';

import * as routes from './routes';


// todo: invalid method

const app = new Hono()
  .route('/webhooks/scheduled-puzzle', routes.webhooks.scheduledPuzzle)
  .route('/webhooks/slack', routes.webhooks.slack)
  .route('/', routes.landing)
  .route('/register', routes.register);
  // .notFound()
  // .onError();

export default app;
