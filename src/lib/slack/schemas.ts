import { z } from 'zod';
import { ZString } from '../../schemas/primitive';

export const ZTokenRequest = z.object({
  client_id: ZString,
  client_secret: ZString,
  code: ZString,
});

export const ZPostMessageRequest = z.object({
  channel: ZString,
  text: z.string().optional(),
});

import { KnownBlock } from '@slack/web-api';

interface ICommandTextResponse {
    response_type: 'in_channel';
    text: string;
}

interface ICommandBlockResponse extends ICommandTextResponse {
    blocks: KnownBlock[];
}