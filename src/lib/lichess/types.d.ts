
/**
 * @see https://lichess.org/api#tag/Puzzles/operation/apiPuzzleDaily
 */
export type DailyPuzzleResponse = {
  puzzle: {
    id: string;
    initialPly: number;
    plays: number;
    rating: number;
    solution: string[];
    themes: string[];
  }
}

export type DailyPuzzleMetadata = {
  puzzleUrl: string;
  puzzleThumbUrl: string;
}
