import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { timeout } from 'hono/timeout';

import { getScheduledDelivery } from '@/lib/db/queries/schedule';
import { zScheduledDeliveryRequestBody } from '@/lib/dtos/qstash';
import { getDailyPuzzle } from '@/lib/lichess';
import { verifyQStashSignature } from '@/lib/qstash';
import { blocks } from '@/lib/slack';
import { handleEffectError, Oops, RequestError } from '@/lib/utils/errors';
import { getLocalized } from '@/lib/utils/locale';
import { zodValidator } from '@/middleware/zod-validator';
import { dbProvider } from '@/middleware/db-provider';

export const schedule = new Hono()
  .use(
    '*',
    timeout(2.8 * 1000, () => {
      return new HTTPException(408, {
        message: 'Request took longer than 2.8 seconds',
      });
    })
  )
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
        throw new RequestError('Invalid job ID', {
          headers: c.req.raw.headers,
          body: { jobId },
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
        signal: AbortSignal.timeout(5 * 1000),
      }).catch(handleEffectError);

      return c.body(null, 200);
    }
  )
  .onError((error, c) => {
    const { status } = Oops.parseError(error);

    if (status < 500) {
      // Unverified or malformed requests
      // should not be retried
      c.header('upstash-nonretryable-error', `${true}`);
    }

    return c.body(null, status);
  });
