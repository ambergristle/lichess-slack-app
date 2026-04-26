import { Oops, ResponseError } from '@/lib/utils/errors';

/**
 * @see https://lichess.org/api#tag/puzzles/GET/api/puzzle/daily
 */
export const getDailyPuzzle = async (): Promise<DailyPuzzle> => {
  try {
    const res = await fetch('https://lichess.org/api/puzzle/daily');
    const json = await res.json();

    if (!res.ok) {
      throw new ResponseError(json.error, {
        service: 'lichess',
        statusCode: res.status,
        headers: res.headers,
      });
    }

    const puzzleId = json.puzzle.id;
    if (!puzzleId || typeof puzzleId !== 'string') {
      throw new ResponseError('Unexpected Daily Puzzle response', {
        service: 'lichess',
        statusCode: res.status,
        headers: res.headers,
        received: json,
      });
    }

    return {
      puzzleUrl: `https://lichess.org/training/${puzzleId}`,
      puzzleThumbUrl: `https://lichess1.org/training/export/gif/thumbnail/${puzzleId}.gif`,
    };
  } catch (cause) {
    throw Oops.fromError('Failed to get Daily Puzzle', cause);
  }
};

export type DailyPuzzle = {
  puzzleUrl: string;
  puzzleThumbUrl: string;
};
