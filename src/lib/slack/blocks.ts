import type { KnownBlock } from '@slack/web-api';


interface IGetDailyPuzzleParams {
    puzzleUrl: string;
    puzzleThumbUrl: string;
}

export const getDailyPuzzleBlocks = ({
  puzzleUrl,
  puzzleThumbUrl,
}: IGetDailyPuzzleParams): KnownBlock[] => [
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
];


interface IGetNotFoundParams {
    command: string; 
}

export const getNotFoundBlocks = ({ 
  command, 
}: IGetNotFoundParams): KnownBlock[] => [
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `Slash command ${command} is a shout into the void`,
    },
  },
];


export const getInvalidRequestBlocks = () => [
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: 'Your request was invalid. Make sure this app'
        + 'is correctly installed in your workspace'
        + 'or try /help for available commands',
    },
  },
];
