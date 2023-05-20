import type { RequestHandler } from 'express';

/**
   * Client makes request to https://slack.com/oauth/v2/authorize
   * @param client_id
   * @param scope commands,incoming-webhook
   */

export const handleAuthorize: RequestHandler = async (req, res) => {

  /** server receives event from slack oauth */

  /**
   * Server makes request to https://slack.com/api/oauth.v2.access
   * @param client_id
   * @param client_secret
   * @param code // from event.queryStringParameters.code
   * @param redirect_uri https://slack-app-lichess.org/lambda/lichess-slack-app-authorize
   */

  /**
   * Server writes successful response to db
   * @param team_id
   * @param channel_id
   * @param webhook_url
   * @param object // self embed?
   * @param preferred_time defaulted
   * @returns ok
   */

  return res.status(418).json({
    success: true,
    message: 'Auth not yet implemented',
  });
};
