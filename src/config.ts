import { KnownError } from './lib/utils/errors';

const config = {
  environment: 'development',

  databaseUrl: '',

  slack: {
    appId: env('SLACK_APP_ID'),
    clientId: env('SLACK_CLIENT_ID'),
  },

  baseUrl: '',
};

export default config;

function env(key: string): string {
  const value = process.env[key];

  if (!value) {
    throw new KnownError(`Configuration Error: Environment missing ${key}`);
  }

  return value;
}
