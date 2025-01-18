import { Hono } from 'hono';

import * as routes from './routes';


// todo: invalid method

const app = new Hono()
  .route('/webhooks/schedule', routes.webhooks.schedule)
  .route('/webhooks/slack', routes.webhooks.slack)
  /**
   * Expose app info and registration button
   * - The registration url points to Slack, where users
   * can authorize this app. It includes a redirect uri
   * that will automatically return users to the /slack/register
   * route, along with a registration code
   */
  .route('/', routes.landing)
  .route('/register', routes.register)
  // .notFound()
  // .onError();

export default app;
