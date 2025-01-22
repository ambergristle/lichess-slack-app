import { Hono } from 'hono';
import { jsxRenderer } from 'hono/jsx-renderer';

import { Layout } from '@/lib/components/layout';
import { localizer } from '@/middleware/localizer';
import { globalRateLimiter } from '@/middleware/rate-limiter';

export const infoRoute = new Hono()
  .use(globalRateLimiter())
  .get(
    '/',
    localizer(),
    jsxRenderer(Layout),
    async (c) => {
      const { localized } = c.var;

      return c.render(
        <div>
          <h1>
            Info
          </h1>
          <section>
            <h2>
              Commands
            </h2>
            <ul>
              <li>
                <h3>
                  /help
                </h3>
                <p>
                  Get a description of all available commands.
                </p>
              </li>
              <li>
                <h3>
                  /puzzle
                </h3>
              </li>
              <li>
                <h3>
                  /schedule
                </h3>
              </li>
            </ul>
          </section>

        </div>
      );
    }
  );
