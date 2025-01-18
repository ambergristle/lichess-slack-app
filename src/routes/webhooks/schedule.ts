import { Hono } from 'hono';
import wretch from 'wretch'

import { localizer } from '@/lib/middleware/localizer';
import { zodValidator } from '@/lib/middleware/zod-validator';
import { verifyRequest } from '@/lib/services/schedule/verify-request';
import { getDailyPuzzle } from '@/lib/services/lichess';
import { ZScheduledPuzzleData } from '@/lib/services/schedule/schemas';
import { blocks } from '@/lib/services/slack/blocks'


export const schedule = new Hono()

  .use(async (c, next) => {
  // upstash-schedule-id
    const signature = c.req.header('upstash-signature');
    // todo
    const body = c.req.raw.body;
    const arrayBuffer = await c.req.arrayBuffer();
    c.req.bodyCache.arrayBuffer = arrayBuffer;

    const body = await new Response(arrayBuffer).text();
    verifyRequest(body, signature);

    await next();
  })
  /** Dispatch scheduled puzzle delivery */
  .post(
    '/deliver',
    zodValidator('json', ZScheduledPuzzleData),
    localizer(),
    async (c) => {
      // we want some kind of token
      // are we meant to be grabbing this here?
      const { uid: teamId, locale } = c.req.valid('json');

      const bot = await db.getBot(teamId);
      if (!bot) throw new PersistenceError('Bot not found', {
        code: 'not_found',
        collection: 'bots',
        op: 'read',
        filter: { teamId },
      });

      const { puzzleThumbUrl, puzzleUrl } = await getDailyPuzzle();
      const { localized }  = c.var;

      const response = {
        blocks: [
          blocks.image({
            title: puzzleThumbUrl,
            href: puzzleThumbUrl,
            alt: localized.blocks.puzzleTitle,
          }),
          blocks.section({ text: puzzleUrl }),
        ],
      };

      wretch(bot.webhookUrl)
        .post(response)
        .json()
        .catch(console.error)

      /** @todo response? */
      return c.text('ok');
    });
