import axios from 'axios';
import template from 'lodash/template';
import { ZDailyPuzzleResponse } from './schemas';

export class LichessClient {

  private readonly _basePath = 'https://lichess.org';

  private readonly _puzzleThumbUrlTemplate = 'https://lichess1.org/training/export/gif/thumbnail/${puzzleId}.gif';


  private constructor() {
    // 
  }

  public static init() {
    return new LichessClient();
  }

  private async _fetchDailyPuzzle() {
    console.info('Fetching daily puzzle...');
    const response = await axios.get(`${this._basePath}/api/puzzle/daily`);
    const { game, puzzle } = ZDailyPuzzleResponse.parse(response);
  
    return { game, puzzle };
  }

  private _getPuzzleUrl(puzzleId: string) {
    return `${this._basePath}/training/${puzzleId}`;
  }

  private _getPuzzleThumbUrl(puzzleId: string) {
    return template(this._puzzleThumbUrlTemplate)({ puzzleId });
  }


  public async getDailyPuzzle() {
    console.info('Getting daily puzzle data...');
    const { puzzle } = await this._fetchDailyPuzzle();

    const puzzleUrl = this._getPuzzleUrl(puzzle.id);
    const puzzleThumbUrl = this._getPuzzleThumbUrl(puzzle.id);

    return { 
      puzzleUrl,
      puzzleThumbUrl,
    };
  }

}
