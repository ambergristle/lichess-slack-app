import { KnownError } from '@/lib/utils/errors';

/**
 * @see https://lichess.org/api#tag/Puzzles/operation/apiPuzzleDaily
 */
export const getDailyPuzzle = async (): Promise<DailyPuzzle> => {
  const response = await fetch('https://lichess.org/api/puzzle/daily');
  const json = await response.json();

  const puzzleId = json.puzzle.id;
  if (!puzzleId || typeof puzzleId !== 'string') {
    throw new KnownError('Unprocessable response', {
      cause: response,
    });
  }

  return {
    puzzleUrl: `https://lichess.org/training/${puzzleId}`,
    puzzleThumbUrl: `https://lichess1.org/training/export/gif/thumbnail/${puzzleId}.gif`,
  };
};

export type DailyPuzzle = {
  puzzleUrl: string;
  puzzleThumbUrl: string;
};
