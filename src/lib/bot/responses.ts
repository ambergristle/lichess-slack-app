import type { KnownBlock } from '@slack/web-api';

/** 
 * generate daily puzzle blocks 
 * @see https://api.slack.com/interactivity/slash-commands#responding_immediate_response
 * @see https://api.slack.com/block-kit
*/
type BlockResponse = {
  blocks: KnownBlock[];
};

type FetchDailyPuzzle = () => Promise<{
  puzzleUrl: string;
  puzzleThumbUrl: string;
}>;

export const dailyPuzzleResponseFactory = async ({
  fetchDailyPuzzle,
}: {
  fetchDailyPuzzle: FetchDailyPuzzle
}): Promise<BlockResponse> => {
  const {
    puzzleThumbUrl,
    puzzleUrl
  } = await fetchDailyPuzzle()

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

export const notFoundResponseFactory = ({ 
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

export const invalidRequestResponseFactory = (): BlockResponse => {
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

export const helpResponseFactory = (): BlockResponse => {
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
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*Schedule*\n'
            + '`/set-time`'
            + '`/set-time HH:MM`',
        },
      },
    ]
  }
};

// this is going to be tough
const whatever = () => {
  const now = new Date();

  const nowHours = `${now.getHours()}`.padStart(2, '0');
  const nowMinutes = `${now.getMinutes()}`.padStart(2, '0');

  return `${nowHours}:${nowMinutes}`
}

export const schedulingResponseFactory = (): BlockResponse => {
  return {
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: 'whatever'
        },
        accessory: {
          type: "timepicker",
          initial_time: "10:00",
          placeholder: {
            type: "plain_text",
            text: "Select time",
            emoji: true
          },
          action_id: "timepicker-action"
        }
      }
    ]
  }
}

export default {
  help: helpResponseFactory,
  puzzle: dailyPuzzleResponseFactory,
  schedule: schedulingResponseFactory,
}
