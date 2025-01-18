import config from '@/config';
import { SlackError } from '@/lib/errors';



// Any type required for generic spread
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const slackRequestFactory = <A extends any[], R>(
  fn: (...args: A) => R,
) => {
  return (..._args: A) => {
    try {
      return fn(..._args);
    } catch (cause) {
      /** @todo find a better way to distinguish fetch errors */
      const code = (cause as any).code;

      if (!code) throw cause;

      throw new SlackError('Slack API request failed', {
        code,
        cause,
      });
    }
  };
};
