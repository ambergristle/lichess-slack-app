import { 
  WebClient as SlackWebClient,
  type ChatPostMessageArguments,
} from '@slack/web-api';
import { 
  ZIncomingSlashCommand, 
  type TIncomingSlashCommand, 
} from 'dtos/slack';
import { ZPostMessageRequest, ZTokenRequest } from './schemas';


export class SlackClient {
  private client: SlackWebClient;

  private constructor() {
    this.client = new SlackWebClient(process.env.SLACK_TOKEN);
  }

  public static init() {
    return new SlackClient();
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

  public async processSlashCommand(body: TIncomingSlashCommand) {
    const payload = ZIncomingSlashCommand.parse(body);

    switch(payload.command) {
        case 'help':
          return {};
        case 'puzzle':
          return {};
        case 'set-time':
          return {};
        default: 
          throw new Error('Unrecognized command'); // do we want to throw?
    }
  }


}
