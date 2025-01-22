import { Hono } from 'hono';
import { serveStatic } from 'hono/bun';
import { logger } from 'hono/logger';

import * as routes from './routes';


const app = new Hono()
  .use(logger())
  .route('/webhooks/scheduled-puzzle', routes.webhooks.scheduledPuzzleRoute)
  .route('/webhooks/slack', routes.webhooks.slackRoute)
  .get('/public/*', serveStatic({
    root: './',
  }))
  .route('/', routes.landingRoute)
  .route('/register', routes.registerRoute);
  // .notFound()
  // .onError();

export default app;
