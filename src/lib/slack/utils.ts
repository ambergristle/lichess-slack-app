import { SlackError } from '@/lib/errors';
import { unix } from '@/lib/utils';

/**
 * Protect against replay attacks by enforcing X
 * @param timestamp Unix timestamp
 * @returns boolean
 */
export const validateTimestamp = (timestamp: string) => {
  /** future dates are invalid */
  const millisecondDifference = Date.now() - unix.toDate(timestamp);
  if (millisecondDifference < 0) return false;
  /** recommended? expiration */
  const oneMinuteMilliseconds = 1 * 60 * 1000;
  if (millisecondDifference > oneMinuteMilliseconds) return false;

  return true;
};

export const slackRequestFactory = <A extends any[], R>(
  fn: (...args: A) => R,
) => {
  return (..._args: A) => {
    try {
      return fn(..._args);
    } catch (cause) {
      const code = (cause as any).code;

      /** @todo find a better way to distinguish fetch errors */
      if (!code) throw cause;

      throw new SlackError('Slack API request failed', {
        code,
        cause,
      });
    }
  };
};
