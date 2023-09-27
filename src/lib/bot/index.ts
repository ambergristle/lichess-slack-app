import wretch from 'wretch';
import QueryStringAddon from "wretch/addons/queryString"
import responseFactories from './responses'
import { parseBotCredentialResponse } from '../slack/parsers';
import { Bot } from '../../schemas';

const slackApi = wretch('https://slack.com/api')
  .addon(QueryStringAddon)

class SlackBot {

  private static readonly _redirectUrl = '';

  public static readonly commands = responseFactories;

  static get #clientId() {
    const clientId = process.env.SLACK_CLIENT_ID;
    if (!clientId) throw new Error();
    return clientId;
  }

  static get #clientSecret() {
    const secret = process.env.SLACK_CLIENT_SECRET;
    if (!secret) throw new Error();
    return secret
  }

  /**
   * Add bot to Slack workspace and write to database
   */
  public static async register({
    code,
    createBotAccount,
  }: {
    code: string;
    createBotAccount: (credentials: Bot) => void | Promise<void>;
  }) {
    /**
     * @see https://api.slack.com/methods/oauth.v2.access
     */
    const credentials = await slackApi
      .auth(`Basic ${this.#clientId}:${this.#clientSecret}`)
      .query({ 
        code,
        redirect_uri: this._redirectUrl
      })
      .post('/oauth.v2.access')
      .json(parseBotCredentialResponse)

    await createBotAccount(credentials)
  }

  /**
   * Remove bot from Slack workspace and delete from database
   */
  public static async revoke({
    teamId,
    token,
    deleteBotAccount,
  }: {
    teamId: string;
    token: string;
    deleteBotAccount: (params: Pick<Bot, 'teamId'>) => Promise<void>;
  }) {
    // check for existence/auth?

    await slackApi
      .query({ token })
      .post('/auth.revoke')
      .json()

    await deleteBotAccount({ teamId })
  }

}

export default SlackBot;