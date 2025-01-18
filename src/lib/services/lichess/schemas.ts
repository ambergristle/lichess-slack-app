import { z } from 'zod';

/** @see https://lichess.org/api#tag/Puzzles/operation/apiPuzzleDaily */
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
