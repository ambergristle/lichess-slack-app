import { z } from 'zod';

import { DailyPuzzleResponse } from './types';
import { parserFactory } from '../utils';

type Parser<T> = (data: unknown) => T;

const ZDailyPuzzleResponse = z.object({
  puzzle: z.object({
    id: z.string(),
    initialPly: z.number(),
    plays: z.number(),
    rating: z.number(),
    solution: z.string().array(),
    themes: z.string().array(),
  })
})

export const parseDailyPuzzleResponse: Parser<DailyPuzzleResponse> = parserFactory(
  ZDailyPuzzleResponse, 
  {
    documentName: 'DailyPuzzleResponse',
    errorMessage: 'Recieved unprocessable response from Lichess API'
  }
)
