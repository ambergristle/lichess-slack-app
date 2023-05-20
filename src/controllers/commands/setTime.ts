import type { RequestHandler } from 'express';

export const handleSetPuzzleTime: RequestHandler = async (req, res) => {
  // security stuff -> abstract

  // if no time param, try to retrieve current setting
  // else, parse + write requested setting

  // check on not-installed error?

  return res.status(418).json({
    success: true,
    message: 'Set Time not yet implemented',
  });
};
