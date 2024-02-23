import { BlockResponse } from './types';

/**
 * @see https://api.slack.com/block-kit
 */
export default {
  error: (message: string) => ({
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `${message} Please try again later, or contact support.`,
        },
      },
    ]
  }),
  /** 
   * @todo A link to the project, tl;dr, and an enumeration of commands
   */
  help: (): BlockResponse => ({
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: 'Lichess Daily Puzzle Bot',
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: 'Get the Lichess Daily puzzle right in Slack!',
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
          text: '*View and set schedule*\n'
            + '`/schedule`',
        },
      },
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
    scheduledAt,
    timeZone,
    locale,
  }: {
    scheduledAt: Date | undefined;
    timeZone: string,
    locale: string;
  }): BlockResponse => {

    const timeString = scheduledAt?.toLocaleTimeString([locale], {
      timeZone,
      hour: '2-digit',
      minute: '2-digit'
    })

    const initialTime = timeString ?? '12:00';

    const message = timeString
    ? `Your are scheduled to recieve the next puzzle at ${timeString}.`
      + ' You can update or cancel at any time:'
    : 'Select a time to recieve the Lichess Daily Puzzle';

    return {
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
    }
  },

  replaceWithText: (message: string) => ({
    replace_original: true,
    text: message,
  })
}
