import type { RequestHandler } from 'express';
import { LichessClient } from 'lib/lichess';
import { SlackClient } from 'lib/slack';

// runs on a timer maybe? the request doesn't seem to be consumed

/**
 * 
 * @param req 
 * @param res 
 * @returns 
 */
export const handleGetDailyPuzzle: RequestHandler = async (req, res, next) => {
  
  try {
    // retrieve daily puzzle data from lichess api
    const lichess = LichessClient.init();
    const { puzzleUrl, puzzleThumbUrl } = await lichess.getDailyPuzzle();
  
    // generate daily puzzle blocks
    const slack = SlackClient.init();
    const dailyPuzzleBlocks = slack.blocks.dailyPuzzle({
      puzzleUrl,
      puzzleThumbUrl,
    });
    
    // search through db for channels awaiting notification
    // write to slack
    // on success, update db

    // what consumes this?
    return res.status(200).json({
      success: true,
      message: 'Get Puzzle implementation in progress',
      data: dailyPuzzleBlocks,
    });
    
  } catch (error) {
    return next(error);
  }
  
};
