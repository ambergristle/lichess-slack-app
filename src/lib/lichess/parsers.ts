import { z } from 'zod';

/**
 * @see https://lichess.org/api#tag/Puzzles/operation/apiPuzzleDaily
 */

const Perf = z.object({
  key: z.string(),
  name: z.string(),
});

const Player = z.object({
  userId: z.string(),
  name: z.string(),
  color: z.union([
    z.literal('black'),
    z.literal('white'),
  ]),
});

const Game = z.object({
  id: z.string(),
  clock: z.string(),
  perf: Perf,
  players: Player.array().length(2),
  rated: z.boolean(),
});

const MoveCode = z.string();

const Puzzle = z.object({
  id: z.string(),
  initialPly: z.number(),
  plays: z.number(),
  rating: z.number(),
  solution: MoveCode.array(),
  themes: z.string().array(),
});

const DailyPuzzleResponse = z.object({
  // game: Game,
  puzzle: Puzzle,
});

export const parseDailyPuzzleResponse = (data: unknown) => {
  return DailyPuzzleResponse.parse(data);
};
