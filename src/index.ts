import { Hono } from 'hono';
import { logger } from 'hono/logger';

import config from '@/config';
import { site } from '@/routes/site';
import { slack } from '@/routes/webhooks/slack';
import { schedule } from '@/routes/webhooks/schedule';

const app = new Hono()
  .use(logger())
  .route(config.paths.landing, site)
  .route(config.paths.slack, slack)
  .route(config.paths.schedule, schedule)
  .notFound((c) => {
    // No valid client request will ever 404
    return c.notFound();
  });

export default app;
