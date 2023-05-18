import type { RequestHandler } from 'express';
import { LichessClient } from 'lib/lichess';
import { SlackClient } from 'lib/slack';


/**
 * 
 * @param req 
 * @param res 
 * @returns 
 */
export const handleGetDailyPuzzle: RequestHandler = async (req, res) => {
  
  try {

    // check player record?

    const lichess = LichessClient.init();
    const { puzzleUrl, puzzleThumbUrl } = await lichess.getDailyPuzzle();

    // update player record

    const slack = SlackClient.init();
    const dailyPuzzleBlocks = slack.blocks.dailyPuzzle({
      puzzleUrl,
      puzzleThumbUrl,
    });

    // write to slack

    return res.status(200).json({
      success: true,
      message: 'Get Puzzle implementation in progress',
      data: dailyPuzzleBlocks,
    });
    
  } catch (error) {
    console.error(error);
  }
  
};
