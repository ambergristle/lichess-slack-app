import { Document, type IDocument } from './document';
import { ZChannel, type TChannel } from '../schemas/channel';

interface IChannel extends IDocument, TChannel {}

export class Channel extends Document implements IChannel {

  public _schema = ZChannel;

  public teamId: string;
  public channelId: string;
  
  public webhookUrl: string;
  public puzzleScheduledAt: Date;

  constructor() {
    super();
  }

}
