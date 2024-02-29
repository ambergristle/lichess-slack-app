import jwt from 'jsonwebtoken';
import { createHash } from 'crypto';
import wretch from 'wretch';
import { z } from 'zod';

import config from '@/config';
import { parserFactory } from '../utils';
import { parseTokenData } from './parsers';
import { AuthorizationError } from '../errors';

const QStash = wretch('https://qstash.upstash.io/v2');

const ZCreateScheduleResponse = z.object({
  scheduleId: z.string(),
});

const parseCreateScheduleResponse = parserFactory(
  ZCreateScheduleResponse,
  {
    entityName: 'CreateScheduleResponse',
    errorMessage: 'Recieved invalid response',
  },
);

type CreateScheduleOptions = {
  service: string;
  cron: string;
  data: Record<string, unknown>;
}

/**
 * @see https://upstash.com/docs/qstash/api/schedules/create
 */
export const createSchedule = async ({
  service,
  cron,
  data,
}: CreateScheduleOptions) => {
  // Upstash-Forward-My-Header
  return await QStash
    .auth(`Bearer ${config.QSTASH_TOKEN}`)
    .headers({ 
      'upstash-cron': cron,
    })
    .post(data, `/schedules/${config.BASE_URL}${service}`)
    .json(parseCreateScheduleResponse);
};

export const deleteSchedule = async (scheduleId: string) => {
  await QStash
    .auth(`Bearer ${config.QSTASH_TOKEN}`)
    .delete(`/schedules/${scheduleId}`)
    .res();
};

type ValidResult = {
  valid: true;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
}

type InvalidResult = {
  valid: false;
  error: unknown;
}

type VerificationResult = ValidResult | InvalidResult;

const isValidResult = (result: VerificationResult): result is ValidResult => {
  return result.valid;
};

const isInvalidResult = (result: VerificationResult): result is InvalidResult => {
  return result.valid;
};

const verifyToken = (
  path: string,
  body: string, 
  token: string, 
  secret: string,
): VerificationResult => {
  try {
    const payload = jwt.verify(token, secret);
    const data = parseTokenData(payload);

    if (data.sub !== `${config.BASE_URL}${path}`) {
      throw new AuthorizationError('Path does not match claim');
    }

    const nowMilliseconds = new Date().getMilliseconds();

    if (data.exp < nowMilliseconds) {
      throw new AuthorizationError('Token expired');
    }

    if (data.nbf > nowMilliseconds) {
      throw new AuthorizationError('Token not yet valid');
    }

    const hash = createHash('sha256')
      .update(body)
      .digest('base64url');

    if (data.body !== `${hash}=`) {
      throw new AuthorizationError('Raw body does not match claim');
    }

    return {
      valid: true,
      data,
    };
  } catch (error) {
    return {
      valid: false,
      error,
    };
  }
};

export const verifyRequest = (
  path: string,
  body: string,
  token: string | undefined, 
) => {
  if (!token) throw new AuthorizationError('Token is required');

  const results = [
    config.QSTASH_CURRENT_SIGNING_KEY,
    config.QSTASH_NEXT_SIGNING_KEY,
  ].map((secret) => verifyToken(path, body, token, secret));

  const payload = results
    .find(isValidResult);
  if (payload) return payload;

  const cause = results
    .find(isInvalidResult);
    
  throw new AuthorizationError('Invalid signature', { cause });
};
