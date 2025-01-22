import { Hono } from 'hono';
import wretch from 'wretch';
import { z } from 'zod';

import { getBotWebhookUrl } from '@/lib/bot';
import { AuthorizationError, processError } from '@/lib/errors';
import { getDailyPuzzle } from '@/lib/lichess';
import { getLocalized } from '@/lib/locale';
import { verifyRequest } from '@/lib/qstash';
import { blocks } from '@/lib/slack';
import { zodValidator } from '@/middleware/zod-validator';


export const ZScheduledPuzzleData = z.object({
  botId: z.string(),
  locale: z.string(),
}, {
  message: 'Invalid job data',
});


export const scheduledPuzzleRoute = new Hono()
  .use(async (c, next) => {
    // todo: could grab upstash-schedule-id instead of
    // passing the botId/locale in the payload
    const signature = c.req.header('upstash-signature');
    if (!signature) {
      throw new AuthorizationError('Request Unsigned');
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
    })
  .onError((error, c) => {
    const { status, message } = processError(error);

    return c.body(message, 500);
  });
