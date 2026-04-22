import { KnownError } from './errors';

/**
 * Get a required value from the environment. Is compatible with
 * all runtimes that support Hono, including Cloudflare.
 * @param key Environment variable key
 * @returns Value, or throws error
 */
export const secret = (key: Secret): string => {
  const value = process.env[key];

  if (!value) {
    throw new KnownError(`Configuration Error: Environment missing ${key}`);
  }

  return value;
};

type Secret =
  | 'ENCRYPTION_KEY'
  | 'QSTASH_TOKEN'
  | 'QSTASH_CURRENT_SIGNING_KEY'
  | 'QSTASH_NEXT_SIGNING_KEY'
  | 'SLACK_CLIENT_SECRET'
  | 'SLACK_SIGNING_SECRET';
