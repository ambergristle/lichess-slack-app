import { 
  Document, 
  type IDocument, 
} from './document';
import {
  ZChannel,
  ZChannelData,
} from 'schemas/channel';
import type {
  TChannel,
  TChannelSchema,
  TChannelData,
} from 'schemas/channel';

interface IChannel extends IDocument, TChannel {}

export class Channel extends Document<TChannelSchema> implements IChannel {

  public readonly _schema = ZChannel;

  public teamId: string;
  public channelId: string;
  
  public webhookUrl: string;
  public puzzleScheduledAt?: Date;

  private constructor(params: TChannelData) {
    super(ZChannel);

    const channelData = ZChannelData.parse(params);

    this.teamId = channelData.teamId;
    this.channelId = channelData.channelId;
    this.webhookUrl = channelData.webhookUrl;
    this.puzzleScheduledAt = channelData.puzzleScheduledAt;

    this.parse();
  }

  public static init(params: TChannelData): Channel {
    return new Channel(params);
  }

}
