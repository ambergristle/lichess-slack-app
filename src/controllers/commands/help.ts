import type { RequestHandler } from 'express';

export const handleGetHelp: RequestHandler = async (req, res) => {
  // some security stuff that will need to be evaluated in isolation

  // post help blocks to Slack channel:

  return res.status(418).json({
    success: true,
    message: 'Help not yet implemented',
  });
};
