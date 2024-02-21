import { z } from 'zod';

import { DailyPuzzleResponse } from './types';

export const parseDailyPuzzleResponse = (data: unknown): DailyPuzzleResponse => {
  return z.object({
    puzzle: z.object({
      id: z.string(),
      initialPly: z.number(),
      plays: z.number(),
      rating: z.number(),
      solution: z.string().array(),
      themes: z.string().array(),
    })
  }).parse(data);
};
