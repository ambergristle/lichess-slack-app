import { z } from 'zod';

/**
 * @see https://lichess.org/api#tag/Puzzles/operation/apiPuzzleDaily
 */

const ZPerf = z.object({
  key: z.string(),
  name: z.string(),
});

enum Color {
    Black = 'black',
    White = 'white'
}

const ZPlayer = z.object({
  userId: z.string(),
  name: z.string(),
  color: z.nativeEnum(Color),
});

const ZGame = z.object({
  id: z.string(),
  clock: z.string(),
  perf: ZPerf,
  players: ZPlayer.array().length(2),
  rated: z.boolean(),
});

const ZMoveCode = z.string();

const ZPuzzle = z.object({
  id: z.string(),
  initialPly: z.number(),
  plays: z.number(),
  rating: z.number(),
  solution: ZMoveCode.array(),
  themes: z.string().array(),
});

export const ZDailyPuzzleResponse = z.object({
  game: ZGame,
  puzzle: ZPuzzle,
});
