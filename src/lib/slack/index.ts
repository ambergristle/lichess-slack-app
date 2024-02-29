import wretch from 'wretch';
import FormUrlAddon from 'wretch/addons/formUrl';
import QueryStringAddon from 'wretch/addons/queryString';

import config from '../../config';
import { AuthorizationError, SlackError } from '../errors';
import { constructHref, hmac } from '../utils';
import blocks from './blocks';
import {
  parseRegistrationData,
  parseSignature,
  parseUserInfo,
} from './parsers';
import { slackRequestFactory, validateTimestamp } from './utils';

export { blocks };

const SlackApi = wretch('https://slack.com/api')
  .addon(QueryStringAddon);

/**
* @see https://api.slack.com/authentication/oauth-v2#asking
*/
export const getOAuthRedirectUrl = () => {
  const APP_SCOPES = [
    'commands',
    'incoming-webhook',
    'users:read',
  ];

  return constructHref('https://slack.com/oauth/v2/authorize', {
    client_id: config.SLACK_CLIENT_ID,
    scope: APP_SCOPES.join(),
    state: config.STATE,
    redirect_uri: config.REGISTRATION_URL,
  });
};

export const getUserInfo = slackRequestFactory(async (token: string, userId: string) => {
  return await SlackApi
    .auth(`Bearer ${token}`)
    .query({ 
      user: userId,
      include_locale: true,
    })
    .get('/users.info')
    .json(parseUserInfo);
});

export const registerBot = slackRequestFactory(async (code: string) => {
  /** @see https://api.slack.com/methods/oauth.v2.access */
  const authToken = btoa(`${config.SLACK_CLIENT_ID}:${config.SLACK_CLIENT_SECRET}`);

  return await SlackApi
    .addon(FormUrlAddon)
    .auth(`Basic ${authToken}`)
    .formUrl({
      code,
      redirect_uri: config.REGISTRATION_URL,
    })
    .post('', '/oauth.v2.access')
    .json((response) => {
      if (!response.ok) {
        throw new SlackError('Registration Failed', {
          code: response.error, 
        });
      }

      return parseRegistrationData(response);
    });
});

export const unregisterBot = slackRequestFactory(async (token: string) => {
  /** @todo flesh out flow */
  return await SlackApi
    .query({ token })
    .post('/auth.revoke')
    .json();
});

/**
 * Validate signature with hmac
 * @see https://api.slack.com/authentication/verifying-requests-from-slack
 */
export const verifyRequest = (request: {
  headers: Record<string, string>;
  body: string;
}) => {
  try {
    const { signature, timestamp } = parseSignature(request.headers);
  
    const signatureData = `v0:${timestamp}:${request.body}`;
    const expectedSignature = hmac.createDigest(config.SLACK_SIGNING_SECRET, signatureData, 'hex');

    return {
      timestampIsValid: validateTimestamp(timestamp),
      signatureIsValid: hmac.compareDigests(`v0=${expectedSignature}`, signature),
    };

  } catch (cause) {
    throw new AuthorizationError('Signature verification failed', { cause });
  }
};
