import { z } from 'zod';
import { parserFactory } from './lib/utils';

export const ZBot = z.object({
  uid: z.string(),
  teamId: z.string(),
  token: z.string(),
  scope: z.string().array(),
  scheduledAt: z.date().optional(),
});

export const parseBot = parserFactory(
  ZBot,
  {
    documentName: 'Bot',
    errorMessage: 'Invalid Bot',
  },
);
