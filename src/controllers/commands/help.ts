import type { RequestHandler } from 'express';

export const handleGetHelp: RequestHandler = async (req, res) => {
  // Some protection against replay attacks?
  // Check tokens + post help blocks to Slack channel:
  // - puzzle
  // - set-time
};
