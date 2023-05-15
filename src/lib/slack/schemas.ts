import { z } from 'zod';
import { ZString } from 'schemas/primitive';
import type { KnownBlock } from '@slack/web-api';

export const ZTokenRequest = z.object({
  client_id: ZString,
  client_secret: ZString,
  code: ZString,
});

export const ZPostMessageRequest = z.object({
  channel: ZString,
  text: z.string().optional(),
});



export interface ICommandTextResponse {
    response_type: 'in_channel';
    text: string;
}

export interface ICommandBlockResponse extends ICommandTextResponse {
    blocks: KnownBlock[];
}
