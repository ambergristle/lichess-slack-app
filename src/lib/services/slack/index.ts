import wretch from 'wretch';
import FormUrlAddon from 'wretch/addons/formUrl';
import QueryStringAddon from 'wretch/addons/queryString';

import config from '@/config';
import { APP_SCOPE, ZRegistrationResponse, ZUserInfoResponse } from './schemas';


/**
 * Generate a link that begins process of registering bot
 * to user's Slack workspace.
 * @note The redirect url should point to the registration webhook handler
 * @see https://api.slack.com/authentication/oauth-v2#asking
 */
export const generateOAuthRedirectUrl = () => {
  const searchParams = new URLSearchParams({
    client_id: config.SLACK_CLIENT_ID,
    scope: APP_SCOPE,
    state: config.STATE,
    redirect_uri: config.REGISTRATION_URL,
  });

  return `https://slack.com/oauth/v2/authorize?${searchParams.toString()}`;
};

/**
 * Slack API Client
 *
 */

const slack = wretch('https://slack.com/api')
  .addon(QueryStringAddon);

/**
 * Get Slack User Info by user ID
 * @see https://api.slack.com/types/user
 */
export const getUserInfo = async (authToken: string, userId: string) => {
  return await slack
    .auth(`Bearer ${authToken}`)
    .query({
      user: userId,
      include_locale: true,
    })
    .get('/users.info')
    .json(ZUserInfoResponse.parse);
};



/**
 * todo
 */
export const unregisterBot = async (token: string) => {
  return await slack
    .query({ token })
    .post('/auth.revoke')
    .json();
};


class SlackError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);

    this.name = 'SlackError';
  }
}
