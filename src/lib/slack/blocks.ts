

export const getDailyPuzzleBlocks = (puzzleUrl: string, puzzleThumbUrl: string) => [
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
