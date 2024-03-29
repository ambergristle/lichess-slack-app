/** @todo */
const STATE = 'WHAT_IS_THIS';
const DEVELOPMENT_SECRET = process.env.DEVELOPMENT_SECRET;

const BASE_URL = process.env.BASE_URL;

if (!BASE_URL) {
  throw new Error('Base URL unconfigured');
}

const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID;
const SLACK_CLIENT_SECRET = process.env.SLACK_CLIENT_SECRET;
const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET;

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;

if (!SLACK_CLIENT_ID || !SLACK_CLIENT_SECRET || !SLACK_SIGNING_SECRET || !SLACK_BOT_TOKEN) {
  throw new Error('Slack credentials missing');
}

const QSTASH_TOKEN = process.env.QSTASH_TOKEN;
const QSTASH_CURRENT_SIGNING_KEY = process.env.QSTASH_CURRENT_SIGNING_KEY;
const QSTASH_NEXT_SIGNING_KEY = process.env.QSTASH_NEXT_SIGNING_KEY;

if (!QSTASH_TOKEN || !QSTASH_CURRENT_SIGNING_KEY || !QSTASH_NEXT_SIGNING_KEY) {
  throw new Error('QStash credentials missing');
}

export default {
  DEVELOPMENT_SECRET,
  STATE,
  BASE_URL,
  REGISTRATION_URL: `${BASE_URL}/slack/register`,
  SLACK_CLIENT_ID,
  SLACK_CLIENT_SECRET,
  SLACK_SIGNING_SECRET,
  SLACK_BOT_TOKEN, //
  QSTASH_TOKEN,
  QSTASH_CURRENT_SIGNING_KEY,
  QSTASH_NEXT_SIGNING_KEY,
};
