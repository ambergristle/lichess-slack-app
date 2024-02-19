import type { KnownBlock } from '@slack/web-api';

type BlockResponse = {
  blocks: KnownBlock[];
};

/** 
 * @todo who does this belong to?
 * @see https://api.slack.com/interactivity/slash-commands#responding_immediate_response
 * @see https://api.slack.com/block-kit
 */
export default {
  /** A 404 error response */
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
  /** A generic request error response */
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
  /** 
   * @todo A link to the project + a brief enumeration of
   * available commands. Bot deletion
   */
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
  /** A thumbnail of + link to the daily puzzle */
  puzzle: ({
    puzzleThumbUrl,
    puzzleUrl
  }: {
    puzzleThumbUrl: string;
    puzzleUrl: string;
  }): BlockResponse => ({
    /** @todo get creative */
    blocks: [
      {
        type: 'image',
        title: {
          type: 'plain_text',
          text: puzzleThumbUrl,
        },
        image_url: puzzleThumbUrl,
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
  /** 
   * A message with the user's current scheduled time (if any)
   * + a time-picker initialized to the same. Picker action
   * is caught by /schedule/set
   */
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

  whatever: (message: string) => ({
    replace_original: true,
    text: message,
  })
}
