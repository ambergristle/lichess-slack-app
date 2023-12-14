import type { KnownBlock } from '@slack/web-api';

/** @todo who does this belong to? */

/** 
 * Generate daily puzzle blocks 
 * @see https://api.slack.com/interactivity/slash-commands#responding_immediate_response
 * @see https://api.slack.com/block-kit
*/
type BlockResponse = {
  blocks: KnownBlock[];
};

const dailyPuzzleResponseFactory = ({
  puzzleThumbUrl,
  puzzleUrl
}: {
  puzzleThumbUrl: string;
  puzzleUrl: string;
}): BlockResponse => {

  return {
    blocks: [
      {
        type: 'image',
        title: {
          type: 'plain_text',
          // can we do anything more interesting?
          text: puzzleThumbUrl,
        },
        image_url: puzzleThumbUrl,
        // let's get current date/some meta in here
        alt_text: 'Today\'s Lichess Daily Puzzle',
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: puzzleUrl,
        },
      },
    ]
  }
};

const notFoundResponseFactory = ({ 
  command, 
}: {
  command: string;
}): BlockResponse => {

  return {
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `Slash command ${command} is a shout into the void`,
        },
      },
    ]
  }
};

const invalidRequestResponseFactory = (): BlockResponse => {

  return {
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: 'Your request was invalid. Make sure this app'
            + ' is correctly installed in your workspace'
            + ' or try /help for available commands',
        },
      },
    ]
  }
};

const helpResponseFactory = (): BlockResponse => {

  return {
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: 'Hello world',
        },
      },
      {
        type: 'divider',
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*Get today\'s puzzle*\n'
            + '`/puzzle`',
        },
      },
      // {
      //   type: 'section',
      //   text: {
      //     type: 'mrkdwn',
      //     text: '*Schedule*\n'
      //       + '`/set-time`'
      //       + '`/set-time HH:MM`',
      //   },
      // },
    ]
  }
};

export const schedulingResponseFactory = (
  scheduledAt: Date | undefined,
  timeZone: string,
): BlockResponse => {
  const displayString = scheduledAt?.toLocaleString('en-US', {
    timeZone
  });

  /** @todo default */

  const infoText = displayString
    ? `Your are scheduled to recieve the next puzzle at ${displayString}.`
      + ' You can update or cancel at any time:'
    : 'Select a time to recieve the Lichess Daily Puzzle';

  return {
    blocks: [
      
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: infoText
        },
      },
      {
        type: 'actions',
        block_id: "timepicker-block",
        elements: [{
          type: "timepicker",
          initial_time: "10:45",
          placeholder: {
            type: "plain_text",
            text: "Select time",
            emoji: true
          },
          action_id: "timepicker-action"
        }]
      }
    ]
  }
}

export default {
  responses: {
    help: helpResponseFactory,
    puzzle: dailyPuzzleResponseFactory,
    schedule: schedulingResponseFactory,
  }
}
