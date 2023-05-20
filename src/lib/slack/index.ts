import { 
  WebClient as SlackWebClient,
  type ChatPostMessageArguments,
} from '@slack/web-api';
import { getDailyPuzzleBlocks, getNotFoundBlocks } from './blocks';
import { ZPostMessageRequest, ZSlashCommand, ZTokenRequest, type TSlashCommand, ZSlackHeaders } from './schemas';
import { Channel } from 'models/channel';
import { safeCompareHmacDigests, getHmacHexDigest } from './utils';
import template from 'lodash/template';


export class SlackClient {

  /** 
   * @token timestamp Extracted from request headers
   * @token body Stringified payload
   */
  private _signatureTemplate = 'v0:${timestamp}:${body}';

  private _client: SlackWebClient;

  private constructor() {
    this._client = new SlackWebClient(process.env.SLACK_TOKEN);
  }

  public static init() {
    return new SlackClient();
  }

  private get _clientSecret() {
    const secret = process.env.SLACK_CLIENT_SECRET;
    if (!secret) throw new Error('Slack client secret could not be found');
    return secret;
  }

  private get _clientId() {
    const id = process.env.SLACK_CLIENT_ID;
    if (!id) throw new Error('Slack client id could not be found');
    return id;
  }

  get blocks() {
    return {
      dailyPuzzle: getDailyPuzzleBlocks,
      notFound: getNotFoundBlocks,
    };
  }

  /**
   * Generate the signature data string expected given request headers + body
   * @param body Stringified Request.body
   * @param timestamp Request timestamp
   * @returns Formatted signature string
   */
  private _getSignatureData(body: string, timestamp: string) {

    return template(this._signatureTemplate)({
      body,
      timestamp,
    });
  }

  /**
   * @todo type request?
   * @todo naming or throw on invalid?
   * @todo rate limiting?
   * Determine whether the request signature is valid and corresponds
   * with the request payload
   * @param req Incoming request, headers and body expected
   * @returns 
   */
  private _verifySignature(req: any) {

    // utf-8 encode secret?
    const { signature, timestamp } = ZSlackHeaders.parse(req.headers);
    // utf-8 encode body? TextEncoder("utf-8").encode
    const bodyString = JSON.stringify(req.body);
    const signatureData = this._getSignatureData(bodyString, timestamp);

    const expectedSignature = getHmacHexDigest(this._clientSecret, signatureData);

    return {
      isValid: safeCompareHmacDigests(expectedSignature, signature),
      headers: { signature, timestamp },
      body: req.body,
    };
  }

  /**
   * 
   * @param code 
   * @returns 
   */
  public async getTokenFromOAuth(code: string) {
    const credentials = ZTokenRequest.parse({
      client_id: this._clientId,
      client_secret: this._clientSecret,
      code,
    });

    const result = await this._client.oauth.v2.access(credentials);

    if (result.ok) return result; // parse?
    throw new Error(result.error);
  }

  /**
   * 
   * @param req 
   */
  public parseHeaders(req: any) {
    const { isValid, headers, body } = this._verifySignature(req);
    if (!isValid) throw new Error('Invalid signature');
    return { isValid, headers, body };
  } 

  /**
   * @todo class?
   * @param body 
   * @returns 
   */
  public parseSlashCommand(body: TSlashCommand) {
    const slashCommand = ZSlashCommand.parse(body);

    const channel = Channel.init({
      teamId: slashCommand.team_id,
      channelId: slashCommand.channel_id,
      webhookUrl: slashCommand.response_url,
    });

    return { channel };
  }

  /**
   * 
   * @param options 
   * @returns 
   */
  public async postMessage(options: ChatPostMessageArguments) {
    const payload = ZPostMessageRequest.parse(options);
    return await this._client.chat.postMessage(payload);
  }

}
