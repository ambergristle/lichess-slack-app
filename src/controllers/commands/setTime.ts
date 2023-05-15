import type { RequestHandler } from 'express';

export const handleSetPuzzleTime: RequestHandler = async (req, res) => {
  // Some protection against replay attacks?
  // Can return current setting
  // Set time setting by id
};
