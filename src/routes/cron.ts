import { Hono } from 'hono';
import { z } from 'zod';

import { zodValidator } from '@/lib/middleware/zod-validator';
import { verifyRequest } from '@/lib/cron';
import { getDailyPuzzle } from '@/lib/lichess';
import { blocks } from '@/lib/slack';

const ZScheduledPuzzleData = z.object({
  uid: z.string(),
  locale: z.string(),
});


export const cron = new Hono();

cron.use(async (c, next) => {
  // upstash-schedule-id
  const token = c.req.header('upstash-signature');

  const arrayBuffer = await c.req.arrayBuffer();
  c.req.bodyCache.arrayBuffer = arrayBuffer;

  const body = await new Response(arrayBuffer).text();
  verifyRequest(c.req.path, body, token);

  await next();
});

/**
 * Dispatch scheduled puzzle delivery
 */
cron.post(
  '/deliver',
  zodValidator('json', ZScheduledPuzzleData),
  async (c) => {
    // we want some kind of token
    const { uid: teamId, locale } = c.req.valid('json');

    const bot = await db.getBot(teamId);
    if (!bot) throw new PersistenceError('Bot not found', {
      code: 'not_found',
      collection: 'bots',
      op: 'read',
      filter: { teamId },
    });

    const { puzzleThumbUrl, puzzleUrl } = await getDailyPuzzle();
    const localizations = await getLocalizations(locale);

    const response = {
      blocks: [
        blocks.image({
          title: puzzleThumbUrl,
          href: puzzleThumbUrl,
          alt: localizations.blocks.puzzleTitle,
        }),
        blocks.section({ text: puzzleUrl }),
      ],
    };

    wretch(bot.webhookUrl).post(response);

    /** @todo response? */
    return c.text('ok');
  });
