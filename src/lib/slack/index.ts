import { 
  WebClient as SlackWebClient,
  type ChatPostMessageArguments,
} from '@slack/web-api';
import { getDailyPuzzleBlocks } from './blocks';
import { ZPostMessageRequest, ZTokenRequest } from './schemas';


export class SlackClient {
  private client: SlackWebClient;

  private constructor() {
    this.client = new SlackWebClient(process.env.SLACK_TOKEN);
  }

  public static init() {
    return new SlackClient();
  }

  private _getDailyPuzzleBlocks({ puzzleUrl, puzzleThumbUrl }: { puzzleUrl: string, puzzleThumbUrl: string }) {
    return getDailyPuzzleBlocks(puzzleUrl, puzzleThumbUrl);
  }

  public async getTokenFromOAuth(code: string) {
    const credentials = ZTokenRequest.parse({
      client_id: process.env.SLACK_CLIENT_ID,
      client_secret: process.env.SLACK_CLIENT_SECRET,
      code,
    });

    const result = await this.client.oauth.v2.access(credentials);

    if (result.ok) return result; // parse?
    throw new Error(result.error);
  }

  public async postMessage(options: ChatPostMessageArguments) {
    const payload = ZPostMessageRequest.parse(options);
    return await this.client.chat.postMessage(payload);
  }

  get blocks() {
    return {
      dailyPuzzle: this._getDailyPuzzleBlocks,
    };
  }

}
