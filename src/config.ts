import { ConfigurationError } from './lib/utils/errors';

const config = {
  environment: env('ENVIRONMENT') ?? 'development',

  databaseUrl: '',

  slack: {
    appId: env('SLACK_APP_ID'),
    clientId: env('SLACK_CLIENT_ID'),
  },

  baseUrl: '',
  paths: {
    landing: '/',
    register: '/register',
    slack: '/webhooks/slack',
    schedule: '/webhooks/schedule',
  },

  oauthStateCookieName: 'lsa_auth_state',
} as const;

export default config;

function env(key: string): string {
  const value = process.env[key];

  if (!value) {
    throw new ConfigurationError(`Environment missing ${key} variable`);
  }

  return value;
}
