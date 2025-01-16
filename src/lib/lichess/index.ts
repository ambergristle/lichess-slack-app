import { z } from 'zod';

import type { DailyPuzzle } from '@/lib/types';

/**
 * @see https://lichess.org/api#tag/Puzzles/operation/apiPuzzleDaily
 */
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

// const parseDailyPuzzleResponse: Parser<DailyPuzzleResponse> = parserFactory(
//   ZDailyPuzzleResponse,
//   {
//     entityName: 'DailyPuzzleResponse',
//     errorMessage: 'Recieved unprocessable response from Lichess API',
//   },
// );


export const getDailyPuzzle = async (): Promise<DailyPuzzle> => {
  try {
  /**
   * @see https://lichess.org/api#tag/Puzzles/operation/apiPuzzleDaily
   */
    const response = await fetch('https://lichess.org/api/puzzle/daily');
    if (!response.ok) {
      throw new Error(response.data);
    }

    const data = await response.json();
    const { puzzle } = ZDailyPuzzleResponse.parse(data);


    /** @todo safely construct query strings */
    return {
      puzzleUrl: `https://lichess.org/training/${puzzle.id}`,
      puzzleThumbUrl:
        `https://lichess1.org/training/export/gif/thumbnail/${puzzle.id}.gif`,
    };

  } catch (cause) {
    throw new Error('Failed to connect to Lichess', { cause });
  }
};
