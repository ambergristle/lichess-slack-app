import { z } from 'zod';

export const ZScheduledPuzzleData = z.object({
  uid: z.string(),
  locale: z.string(),
}, {
  message: 'Invalid job data',
});
