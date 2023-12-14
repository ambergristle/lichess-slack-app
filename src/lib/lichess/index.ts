import wretch from 'wretch';
import { parseDailyPuzzleResponse } from './parsers';

const LichessApi = wretch(`https://lichess.org/api`)

/**
 * Responsible for interacting with the Lichess web api
 */
export default {
    
  fetchDailyPuzzle: async () => {
    console.info('Fetching daily puzzle data...');

    /**
     * @see https://lichess.org/api#tag/Puzzles/operation/apiPuzzleDaily
     */
    const { puzzle } = await LichessApi
      .get('/puzzle/daily')
      .json(parseDailyPuzzleResponse);

    return {
      puzzleUrl: `https://lichess.org/training/${puzzle.id}`,
      puzzleThumbUrl: `https://lichess1.org/training/export/gif/thumbnail/${puzzle.id}.gif`,
    };

  }, 
};
