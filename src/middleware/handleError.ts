import type { ErrorRequestHandler } from 'express';


export const handleError: ErrorRequestHandler = (error, req, res, next) => {
  console.error(error);

  // omit stack for external responses?

  if (res.headersSent) return next(error);

  if (error instanceof Error) return res.status(500).json(error);

  return res.status(500).json({
    success: false,
    message: 'Something went wrong',
  });
};
