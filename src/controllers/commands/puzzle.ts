import type { RequestHandler } from 'express';
import { LichessClient } from 'lib/lichess';
import { SlackClient, SlackRequestParsers } from 'lib/slack';
import { ZPostRequest } from 'lib/slack/schemas';

/**
 * Respond to the /puzzle slash command with daily puzzle slack blocks
 * @param req 
 * @param res 
 * @param next
 * @returns Response containing puzzle blocks or error info
 */
export const handleGetDailyPuzzle: RequestHandler = async (req, res, next) => {
  
  try {

    // #region Process Request

    /** @todo use middleware to bounce invalid origin/shape */
    /** @todo  */
    const request = ZPostRequest.parse(req);

    /** initialize client and validate request */
    const slack = SlackClient.init();
    const { isValid, headers, body } = slack.parseRequest(request, SlackRequestParsers.Slash);  
    
    /** @pending return origin above? */

    if (!isValid) {
      return res.status(200).json(slack.blocks.invalidRequest());
    }

    // #endregion

    // #region Handle Command

    const { channel } = body;

    /**
     * @todo find matching player or search for channels awaiting notification
     * - does it makes 
     */

    /** @todo update db */
    
    /** retrieve daily puzzle data from lichess api */
    const lichess = LichessClient.init();
    const { puzzleUrl, puzzleThumbUrl } = await lichess.getDailyPuzzle();

    // #endregion

    // #region Slack Response

    /** 
     * generate daily puzzle blocks 
     * @see https://api.slack.com/interactivity/slash-commands#responding_immediate_response
     */
    const dailyPuzzleBlocks = slack.blocks.dailyPuzzle({
      puzzleUrl,
      puzzleThumbUrl,
    });

    return res.status(200).json(dailyPuzzleBlocks);

    // #endregion
    
  } catch (error) {
    return next(error);
  }
  
};
