import type { RequestHandler } from 'express';

export const handleGetPuzzle: RequestHandler = async (req, res) => {
  // Grab + return daily puzzle

  return res.status(418).json({
    success: true,
    message: 'Get Puzzle not yet implemented',
  });
};
