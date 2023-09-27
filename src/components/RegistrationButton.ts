
const constructHref = (baseUrl: string, params?: Record<string, string>) => {
  const url = new URL(baseUrl);
    
  if (!params) return url.href;

  Object
    .entries(params)
    .forEach(([key, value]) => {
      if (typeof value !== 'string') throw `Invalid parameter type ${typeof value}`;
      url.searchParams.set(key, value);
    });

  return url.href;
};

const BASE_URL = 'https://f73f-2600-1700-7266-4870-a8f5-5d73-6d4d-80bd.ngrok-free.app';

const REGISTER_URL = `${BASE_URL}/slack/register`;

/**
 * Client
 * @see https://api.slack.com/authentication/oauth-v2#asking
 * @returns 
 */
const getOAuthRedirectUrl = (uid: string) => {
  const CLIENT_ID = process.env.SLACK_CLIENT_ID;
  if (!CLIENT_ID) throw new Error();
    
  const APP_SCOPES = [
    'commands',
    'incoming-webhook',
  ];

  return constructHref('https://slack.com/oauth/v2/authorize', {
    client_id: CLIENT_ID,
    scope: APP_SCOPES.join(),
    state: uid,
    redirect_uri: REGISTER_URL,
  });
};


