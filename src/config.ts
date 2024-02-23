/** @todo */
const STATE = 'WHAT_IS_THIS';

const BASE_URL = process.env.BASE_URL

if (!BASE_URL) {
  throw new Error('Base URL unconfigured')
}

const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID;
const SLACK_CLIENT_SECRET = process.env.SLACK_CLIENT_SECRET;

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;

if (!SLACK_CLIENT_ID || !SLACK_CLIENT_SECRET || !SLACK_BOT_TOKEN) {
  throw new Error('Slack credentials missing');
}

export default {
  STATE,
  BASE_URL,
  REGISTRATION_URL: `${BASE_URL}/slack/register`,
  SLACK_CLIENT_ID,
  SLACK_CLIENT_SECRET,
  
  SLACK_BOT_TOKEN,
};
