import type { RequestHandler } from 'express';

export const handleAuthorize: RequestHandler = async (req, res) => {
  // Grab auth from connection request and link with Slack
  // Create record of Slack interaction

  return res.status(418).json({
    success: true,
    message: 'Auth not yet implemented',
  });
};
