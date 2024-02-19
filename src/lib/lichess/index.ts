import wretch from 'wretch';
import { parseDailyPuzzleResponse } from './parsers';

const LichessApi = wretch(`https://lichess.org/api`)

export default {
  getDailyPuzzle: async () => {
    /**
     * @see https://lichess.org/api#tag/Puzzles/operation/apiPuzzleDaily
     */
    const { puzzle } = await LichessApi
      .get('/puzzle/daily')
      .json(parseDailyPuzzleResponse);

    /** @todo handle error */
    /** @todo safely construct query */

    return {
      puzzleUrl: `https://lichess.org/training/${puzzle.id}`,
      puzzleThumbUrl: `https://lichess1.org/training/export/gif/thumbnail/${puzzle.id}.gif`,
    };
  }, 
};
