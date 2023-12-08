import wretch from 'wretch';
import QueryStringAddon from "wretch/addons/queryString"

import config from '../../config';
import { constructHref, unix } from "../utils";
import hmac from "../hmac";
import { parseBotCredentialResponse, parseHeaders } from "./parsers";

const SlackApi = wretch('https://slack.com/api')
  .addon(QueryStringAddon)

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
 * Validate signature using hmac
 * @see https://api.slack.com/authentication/verifying-requests-from-slack
 */
const verifyRequest = (request: {
  headers: Headers;
  body: ReadableStream<any> | null;
}) => {
  const { signature, timestamp } = parseHeaders(request.headers);

  const signatureData = `v0:${timestamp}:${JSON.stringify(request.body)}`;
  const expectedSignature = hmac.createDigest(config.SLACK_CLIENT_SECRET!, signatureData);
  
  return {
    timestampIsValid: validateTimestamp(timestamp),
    signatureIsValid: hmac.safeCompareDigests(expectedSignature, signature),
  }
}

const registerBot = async (code: string) => {
  /**
   * @see https://api.slack.com/methods/oauth.v2.access
   */
  return await SlackApi
    .auth(`Basic ${config.SLACK_CLIENT_ID}:${config.SLACK_CLIENT_SECRET}`)
    .query({ 
      code,
      redirect_uri: config.REGISTRATION_URL
    })
    .post('/oauth.v2.access')
    .json(parseBotCredentialResponse)
}

const unregisterBot = async (token: string) => {

  return await SlackApi
    .query({ token })
    .post('/auth.revoke')
    .json()
}

/**
 * Use to parse and verify requests
 */
export default {
  getOAuthRedirectUrl,
  verifyRequest,
  registerBot,
  unregisterBot
}