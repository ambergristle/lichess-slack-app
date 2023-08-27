import wretch from 'wretch';
import { parseDailyPuzzleResponse } from './schema';

const BASE_PATH = 'https://lichess.org';

export default {
    
  fetchDailyPuzzle: async () => {
    console.info('Fetching daily puzzle data...');

    const { puzzle } = await wretch(`${BASE_PATH}/api/puzzle/daily`)
      .get()
      .json(parseDailyPuzzleResponse);

    return {
      puzzleUrl: `${BASE_PATH}/training/${puzzle.id}`,
      puzzleThumbUrl: `https://lichess1.org/training/export/gif/thumbnail/${puzzle.id}.gif`,
    };

  }, 
};
