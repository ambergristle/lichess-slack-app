import wretch from 'wretch';

import { parseDailyPuzzleResponse } from './parsers';
import { DailyPuzzleMetadata } from './types';
import { LichessError } from '../errors';

const LichessApi = wretch('https://lichess.org/api');

export default {
  getDailyPuzzle: async (): Promise<DailyPuzzleMetadata> => {
    try {
    /**
     * @see https://lichess.org/api#tag/Puzzles/operation/apiPuzzleDaily
     */
      const { puzzle } = await LichessApi
        .get('/puzzle/daily')
        .json(parseDailyPuzzleResponse);

      /** @todo safely construct query strings */
      return {
        puzzleUrl: `https://lichess.org/training/${puzzle.id}`,
        puzzleThumbUrl: `https://lichess1.org/training/export/gif/thumbnail/${puzzle.id}.gif`,
      };

    } catch (cause) {
      throw new LichessError('Failed to connect to Lichess', { cause });
    }
  }, 
};
