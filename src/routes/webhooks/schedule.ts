import { Hono } from 'hono';

import { getDailyPuzzle } from '@/lib/lichess';
import { zScheduledDeliveryRequestBody } from '@/lib/dtos/qstash';
import { blocks } from '@/lib/slack';
import { verifyQStashSignature } from '@/lib/qstash';
import {
  handleEffectError,
  KnownError,
  processError,
} from '@/lib/utils/errors';
import { getLocalized } from '@/lib/utils/locale';
import { zodValidator } from '@/middleware/zod-validator';
import { dbProvider } from '@/middleware/db-provider';
import { getScheduledDelivery } from '@/lib/db/queries/schedule';

export const schedule = new Hono()
  /** Dispatch scheduled puzzle delivery */
  .post(
    '/',
    verifyQStashSignature(),
    zodValidator('json', zScheduledDeliveryRequestBody),
    dbProvider(),
    async (c) => {
      const { jobId } = c.req.valid('json');
      const scheduledDelivery = await getScheduledDelivery(c.var.db, jobId);
      if (!scheduledDelivery) {
        throw new KnownError('Invalid job ID', {
          cause: { jobId },
        });
      }

      const { deliveryUrl, locale } = scheduledDelivery;

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

      const body = JSON.stringify(response);

      fetch(deliveryUrl, {
        method: 'POST',
        body,
        headers: {
          'content-type': 'application/json',
          'content-length': body.length.toString(),
        },
      }).catch(handleEffectError);

      return c.body(null, 200);
    }
  )
  .onError((error, c) => {
    const { message } = processError(error);

    return c.body(message, 500);
  });
