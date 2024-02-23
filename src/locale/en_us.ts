
const locale = {

  title: 'Lichess Slack App',

  pageTitle: 'Lichess Daily Puzzle Slack App',

  appDescription: 'Schedule daily puzzle delivery, or get it on demand,'
    + ' directly in the Slack channel of your choice.',

  addToSlack: 'Add to Slack',
  sourceCode: 'Source code',

  pageDoesNotExist: 'This page does not exist',
  returnToSafety: 'Return to safety',

  oops: 'Oops',
  somethingWentWrong: 'Something went wrong. Please contact support',

  registrationFailed: 'Error: Registration failed',
  registrationSucceeded: 'App registered successfully!',
  closeWindowPrompt: 'You can now close this window',

  blocks: {
    /** @token message */
    error: '${message} Please try again later, or contact support.',
    helpTitle: 'Lichess Daily Puzzle Bot',
    helpInfo: 'Get the Lichess Daily puzzle right in Slack!',
    helpPuzzle: '*Get today\'s puzzle*\n`/puzzle`',
    helpSchedule: '*View and set schedule*\n`/schedule`',
    puzzleTitle: 'Today\'s Lichess Daily Puzzle',
    scheduleInfo: 'Your are scheduled to recieve the next puzzle at ${timeString}.'
      + ' You can update or cancel at any time:',
    schedulePrompt: 'Select a time to recieve the Lichess Daily Puzzle'
  },

  commandErrors: {
    help: 'Failed to retrieve app documentation.',
    puzzle: 'The daily puzzle is currently unavailable.',
    schedule: 'Your scheduling preferences could not be retrieved.',
    setSchedule: 'Puzzle delivery could not be scheduled.',
  },

  httpErrors: {
    invalidMethod: 'Invalid Method',
    notFound: 'Not Found',
    unauthorized: 'Unauthorized',
  },
}

export default locale;
