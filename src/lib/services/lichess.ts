import wretch from 'wretch';
import { z } from 'zod';


export type DailyPuzzle = {
  puzzleUrl: string;
  puzzleThumbUrl: string;
}

/** Lichess HTTP API Client */
const lichess = wretch('https://lichess.org/api');

/** @see https://lichess.org/api#tag/Puzzles/operation/apiPuzzleDaily */
export const getDailyPuzzle = async (): Promise<DailyPuzzle> => {
  try {
    const { puzzle } = await lichess
      .get('/puzzle/daily')
      .json(
        z.object({
          puzzle: z.object({
            id: z.string(),
          }),
        }, {
          message: 'Recieved unprocessable response from Lichess API',
        }).parse
      );

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
