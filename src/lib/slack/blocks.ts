import type { KnownBlock } from '@slack/web-api';

/** @todo who does this belong to? */

type BlockResponse = {
  blocks: KnownBlock[];
};

/** 
 * @see https://api.slack.com/interactivity/slash-commands#responding_immediate_response
 * @see https://api.slack.com/block-kit
*/
export default {
  notFound: ({ 
    command, 
  }: {
    command: string;
  }): BlockResponse => ({
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          /** @todo does this make sense? */
          text: `Slash command ${command} is a shout into the void`,
        },
      },
    ]
  }),

  invalidRequest: (): BlockResponse => ({
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
  }),

  help: (): BlockResponse => ({
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
      //     text: '*View and set schedule*\n'
      //       + '`/set-time`',
      //   },
      // },
    ]
  }),

  puzzle: ({
    puzzleThumbUrl,
    puzzleUrl
  }: {
    puzzleThumbUrl: string;
    puzzleUrl: string;
  }): BlockResponse => ({
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
  }),

  schedule: ({
    message,
    initialTime,
  }: {
    message: string;
    initialTime: string;
  }): BlockResponse => ({
    blocks: [
      
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: message
        },
      },
      {
        type: 'actions',
        block_id: "timepicker-block",
        elements: [{
          type: "timepicker",
          initial_time: initialTime,
          placeholder: {
            type: "plain_text",
            text: "Select time",
            emoji: true
          },
          action_id: "timepicker-action"
        }]
      }
    ]
  }),
}
