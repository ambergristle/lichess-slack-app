import config from "../config";

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

/**
 * Client
 * @see https://api.slack.com/authentication/oauth-v2#asking
 * @returns 
 */
const getOAuthRedirectUrl = (uid: string) => {
  // user tz?
  const APP_SCOPES = [
    'commands',
    'incoming-webhook',
  ];

  return constructHref('https://slack.com/oauth/v2/authorize', {
    client_id: config.SLACK_CLIENT_ID,
    scope: APP_SCOPES.join(),
    state: uid,
    redirect_uri: config.REGISTRATION_URL,
  });
};


