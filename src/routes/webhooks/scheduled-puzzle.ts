import { Hono } from 'hono';
import wretch from 'wretch';

import { getBotWebhookUrl } from '@/lib/entities/bot';
import { getDailyPuzzle } from '@/lib/services/lichess';
import { blocks } from '@/lib/services/slack';
import { ZScheduledPuzzleData } from '@/lib/services/qstash';
import { processError } from '@/lib/utils/errors';
import { getLocalized } from '@/lib/utils/locale';
import { zodValidator } from '@/middleware/zod-validator';
import { qStashAuthorizer } from '@/middleware/qstash-authorizer';


export const scheduledPuzzleRoute = new Hono()
  .use(qStashAuthorizer())
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
