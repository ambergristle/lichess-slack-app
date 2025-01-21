import wretch from 'wretch';
import { z } from 'zod';


const lichess = wretch('https://lichess.org/api');

const ZDailyPuzzleResponse = z.object({
  puzzle: z.object({
    id: z.string(),
    initialPly: z.number(),
    plays: z.number(),
    rating: z.number(),
    solution: z.string().array(),
    themes: z.string().array(),
  }),
}, {
  message: 'Recieved unprocessable response from Lichess API',
});

export type DailyPuzzle = {
  puzzleUrl: string;
  puzzleThumbUrl: string;
}

/** @see https://lichess.org/api#tag/Puzzles/operation/apiPuzzleDaily */
export const getDailyPuzzle = async (): Promise<DailyPuzzle> => {
  try {
    const { puzzle } = await lichess
      .get('/puzzle/daily')
      .json(ZDailyPuzzleResponse.parse);

    return {
      puzzleUrl: `https://lichess.org/training/${puzzle.id}`,
      puzzleThumbUrl:
        `https://lichess1.org/training/export/gif/thumbnail/${puzzle.id}.gif`,
    };

  } catch (cause) {
    throw new LichessError('Failed to connect to Lichess', { cause });
  }
};


class LichessError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);

    this.name = 'LichessError';
  }
}
