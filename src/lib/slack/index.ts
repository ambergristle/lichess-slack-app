import wretch from 'wretch';
import QueryStringAddon from "wretch/addons/queryString"

import config from '../../config';
import { constructHref, hmac, unix } from "../utils";
import {
  parseBotCredentialResponse,
  parseHeaders,
  parseTimeZone
} from "./parsers";

const SlackApi = wretch('https://slack.com/api')
  .addon(QueryStringAddon)

/**
 * Protect against replay attacks by enforcing X
 * @param timestamp Unix timestamp
 * @returns boolean
 */
const validateTimestamp = (timestamp: string) => {
  /** future dates are invalid */
  const millisecondDifference = Date.now() - unix.toDate(timestamp);
  if (millisecondDifference < 0) return false;
  /** recommended? expiration */
  const oneMinuteMilliseconds = 1 * 60 * 1000;
  if (millisecondDifference > oneMinuteMilliseconds) return false

  return true
}

/**
 * Use to parse and verify requests
 */
export default {
  /**
   * @see https://api.slack.com/authentication/oauth-v2#asking
   */
  getOAuthRedirectUrl: (uid: string) => {
    // user tz?
    const APP_SCOPES = [
      'commands',
      'users:read',
    ];
  
    return constructHref('https://slack.com/oauth/v2/authorize', {
      client_id: config.SLACK_CLIENT_ID,
      scope: APP_SCOPES.join(),
      state: uid,
      redirect_uri: config.REGISTRATION_URL,
    });
  },

  getTimeZone: async (userId: string) => {
    return await SlackApi
      .auth(`Bearer ${config.SLACK_BOT_TOKEN}`)
      .query({ user: userId })
      .get('/users.info')
      .json(parseTimeZone)
  },

  registerBot: async (code: string) => {
    /** @see https://api.slack.com/methods/oauth.v2.access */
    return await SlackApi
      .auth(`Basic ${config.SLACK_CLIENT_ID}:${config.SLACK_CLIENT_SECRET}`)
      .query({ 
        code,
        redirect_uri: config.REGISTRATION_URL
      })
      .post('/oauth.v2.access')
      .json(parseBotCredentialResponse)
  },

  unregisterBot: async (token: string) => {
    return await SlackApi
      .query({ token })
      .post('/auth.revoke')
      .json()
  },
  /**
   * Validate signature using hmac
   * @see https://api.slack.com/authentication/verifying-requests-from-slack
   */
  verifyRequest: (request: {
    headers: Headers;
    body: ReadableStream<any> | null;
  }) => {
    const { signature, timestamp } = parseHeaders(request.headers);
  
    const signatureData = `v0:${timestamp}:${JSON.stringify(request.body)}`;
    const expectedSignature = hmac.createDigest(config.SLACK_CLIENT_SECRET, signatureData);
    
    return {
      timestampIsValid: validateTimestamp(timestamp),
      signatureIsValid: hmac.safeCompareDigests(expectedSignature, signature),
    }
  },
}
