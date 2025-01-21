import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import wretch from 'wretch';

import { verifyRequest } from '@/lib/qstash';
import { getDailyPuzzle } from '@/lib/lichess';
import { blocks } from '@/lib/slack';
import { zodValidator } from '@/middleware/zod-validator';
import { z } from 'zod';
import { getLocalized } from '@/lib/locale';
import { getBotWebhookUrl } from '@/lib/bot';


export const ZScheduledPuzzleData = z.object({
  botId: z.string(),
  locale: z.string(),
}, {
  message: 'Invalid job data',
});


export const scheduledPuzzle = new Hono()
  .use(async (c, next) => {
    // todo: could grab upstash-schedule-id instead of
    // passing the botId/locale in the payload
    const signature = c.req.header('upstash-signature');
    if (!signature) {
      throw new HTTPException(401, {
        message: 'Unauthorized',
        cause: { code: 'no-signature' },
      });
    }

    const body = await c.req.text();
    verifyRequest(c, body, signature);

    await next();
  })
  /** Dispatch scheduled puzzle delivery */
  .post(
    '/',
    zodValidator('json', ZScheduledPuzzleData),
    // todo: verify bot?
    async (c) => {
      const { botId, locale } = c.req.valid('json');

      const localized = await getLocalized(locale);
      const { puzzleThumbUrl, puzzleUrl } = await getDailyPuzzle();

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

      const webhookUrl = await getBotWebhookUrl(c, botId);
      wretch(webhookUrl)
        .post(response)
        .res()
        .catch(console.error);

      return c.body(null, 200);
    });
