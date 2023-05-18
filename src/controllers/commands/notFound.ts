import type { RequestHandler } from 'express';

export const handleNotFound: RequestHandler = async (req, res) => {
  // Return 404 block
  // distinct based on source?

  return res.status(404).json({
    success: false,
    message: 'Requested method not found',
  });
};
