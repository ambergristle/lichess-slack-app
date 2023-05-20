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
    // initialize client and validate request
    const slack = SlackClient.init();
    const { isValid, headers, body } = slack.parseHeaders(req);  
    
    // return origin above?
    // to what degree should subsequent logic be bound to this?

    // handle
    if (!isValid) throw new Error();

    const { channel } = slack.parseSlashCommand(body);

    // use channel to find/auth player?
    
    // retrieve daily puzzle data from lichess api
    const lichess = LichessClient.init();
    const { puzzleUrl, puzzleThumbUrl } = await lichess.getDailyPuzzle();
  
    // generate daily puzzle blocks
    const dailyPuzzleBlocks = slack.blocks.dailyPuzzle({
      puzzleUrl,
      puzzleThumbUrl,
    });
    
    // triggered -> search through db for channels awaiting notification

    // update db

    // https://api.slack.com/interactivity/slash-commands#responding_immediate_response
    return res.status(200).json(dailyPuzzleBlocks);
    
  } catch (error) {
    return next(error);
  }
  
};
