import { parserFactory } from '@/lib/utils';
import { z } from 'zod';

export type ScheduledPuzzleData = z.infer<typeof ZScheduledPuzzleData>;
const ZScheduledPuzzleData = z.object({
  uid: z.string(),
  locale: z.string(),
})

export const parseScheduledPuzzleData = parserFactory(
  ZScheduledPuzzleData,
  {
    entityName: 'ScheduledPuzzleData',
    errorMessage: 'Invalid job data'
  }
)

