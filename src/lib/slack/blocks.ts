import {
  formatTimeInput,
  interpolate,
  localizeZonedTime,
} from '@/lib/utils';
import { getLocalizations } from '@/lib/utils/locale';
import { BlockResponse, Command } from './types';

/**
 * @see https://api.slack.com/block-kit
 * @todo inject tz
 */
const blocks = (locale: string) => {
  return {
    /**
     * An ephemeral error message with support details
     */
    error: async (command: Command | undefined) => {
      const localizations = await getLocalizations(locale);

      const defaultMessage = localizations.somethingWentWrong;

      const message = command
        ? localizations.commandErrors[command] ?? defaultMessage
        : defaultMessage;

      const text = interpolate(localizations.blocks.error, {
        message,
      });

      return {
        response_type: 'ephemeral',
        text,
      };
    },
    /** 
     * @todo A link to the project, tl;dr, and an enumeration of commands
     */
    help: async (): Promise<BlockResponse> => {
      const localizations = await getLocalizations(locale);

      return {
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: localizations.blocks.helpInfo,
            },
          },
          {
            type: 'divider',
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: localizations.blocks.helpPuzzle,
            },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: localizations.blocks.helpSchedule,
            },
          },
        ],
      };
    },
    /** A thumbnail of + link to the daily puzzle */
    puzzle: async ({
      puzzleThumbUrl,
      puzzleUrl,
    }: {
      puzzleThumbUrl: string;
      puzzleUrl: string;
    }): Promise<BlockResponse> => {
      const localizations = await getLocalizations(locale);

      return {
        /** @todo get creative */
        blocks: [
          {
            type: 'image',
            title: {
              type: 'plain_text',
              text: puzzleThumbUrl,
            },
            image_url: puzzleThumbUrl,
            alt_text: localizations.blocks.puzzleTitle,
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: puzzleUrl,
            },
          },
        ],
      };
    },
    /** 
     * A message with the user's current scheduled time (if any)
     * + a time-picker initialized to the same. Picker action
     * is caught by /schedule/set
     */
    schedule: async ({
      scheduledAt,
      timeZone,
    }: {
      scheduledAt: { hour: number; minute: number; } | undefined;
      timeZone: string,
    }): Promise<BlockResponse> => {
      const localizations = await getLocalizations(locale);

      const initialTime = scheduledAt
        ? formatTimeInput(scheduledAt)
        : '12:00';
      
      const message = scheduledAt
        ? interpolate(localizations.blocks.scheduleInfo, {
          timeString: localizeZonedTime(scheduledAt, timeZone, locale),
        })
        : localizations.blocks.schedulePrompt;

      return {
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: message,
            },
          },
          {
            type: 'actions',
            block_id: 'timepicker-block',
            elements: [{
              type: 'timepicker',
              initial_time: initialTime,
              placeholder: {
                type: 'plain_text',
                text: localizations.blocks.scheduleSelectTime,
                emoji: true,
              },
              action_id: 'timepicker-action',
            }],
          },
        ],
      };
    },

    /** An ephemeral error message */
    replaceWithText: (message: string) => {
      return {
        replace_original: true,
        text: message,
      };
    },
  };
};

export default blocks;
