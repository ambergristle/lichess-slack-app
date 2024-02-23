import { z } from 'zod';

import { parserFactory, Parser } from '@/lib/utils';
import { DailyPuzzleResponse } from './types';

const ZDailyPuzzleResponse = z.object({
  puzzle: z.object({
    id: z.string(),
    initialPly: z.number(),
    plays: z.number(),
    rating: z.number(),
    solution: z.string().array(),
    themes: z.string().array(),
  }),
});

export const parseDailyPuzzleResponse: Parser<DailyPuzzleResponse> = parserFactory(
  ZDailyPuzzleResponse, 
  {
    entityName: 'DailyPuzzleResponse',
    errorMessage: 'Recieved unprocessable response from Lichess API',
  },
);
