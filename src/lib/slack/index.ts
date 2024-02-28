import wretch from 'wretch';
import FormUrlAddon from 'wretch/addons/formUrl';
import QueryStringAddon from 'wretch/addons/queryString';

import config from '../../config';
import { constructHref, hmac } from '../utils';
import blocks from './blocks';
import {
  parseRegistrationData,
  parseSignature,
  parseUserInfo,
} from './parsers';
import { slackRequestFactory, validateTimestamp } from './utils';
import { SlackError } from '../errors';

const SlackApi = wretch('https://slack.com/api')
  .addon(QueryStringAddon);

/**
 * Use to parse and verify requests
 */
export default {
  blocks,
  /**
   * @see https://api.slack.com/authentication/oauth-v2#asking
   */
  getOAuthRedirectUrl: () => {
    // user tz?
    const APP_SCOPES = [
      'commands',
      'users:read',
    ];
  
    return constructHref('https://slack.com/oauth/v2/authorize', {
      client_id: config.SLACK_CLIENT_ID,
      scope: APP_SCOPES.join(),
      state: config.STATE,
      redirect_uri: config.REGISTRATION_URL,
    });
  },

  getUserInfo: slackRequestFactory(async (userId: string) => {
    return await SlackApi
      .auth(`Bearer ${config.SLACK_BOT_TOKEN}`)
      .query({ 
        user: userId,
        include_locale: true,
      })
      .get('/users.info')
      .json(parseUserInfo);
  }),

  registerBot: slackRequestFactory(async (code: string) => {
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
  }),

  unregisterBot: slackRequestFactory(async (token: string) => {
    /** @todo flesh out flow */
    return await SlackApi
      .query({ token })
      .post('/auth.revoke')
      .json();
  }),

  /**
   * Validate signature using hmac
   * @see https://api.slack.com/authentication/verifying-requests-from-slack
   */
  verifyRequest: (request: {
    headers: Headers;
    body: ReadableStream<unknown> | null;
  }) => {
    const { signature, timestamp } = parseSignature(request.headers);
  
    const signatureData = `v0:${timestamp}:${JSON.stringify(request.body)}`;
    const expectedSignature = hmac.createDigest(config.SLACK_CLIENT_SECRET, signatureData);
    
    return {
      timestampIsValid: validateTimestamp(timestamp),
      signatureIsValid: hmac.safeCompareDigests(expectedSignature, signature),
    };
  },
};
