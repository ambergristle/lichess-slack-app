import wretch from 'wretch';
import FormUrlAddon from 'wretch/addons/formUrl';
import QueryStringAddon from 'wretch/addons/queryString';

import config from '@/config';
import { APP_SCOPE, ZRegistrationResponse, ZUserInfoResponse } from './schemas';


/**
 * Slack API Client
 *
 */

const slack = wretch('https://slack.com/api')
  .addon(QueryStringAddon);


export const getBotContext = async (teamId: string, userId: string) => {
  const bot = await db.getBot(teamId);
    if (!bot) throw new PersistenceError('Bot not found', {
      code: 'not_found',
      collection: 'bots',
      op: 'read',
      filter: { teamId },
    });

    const preferences = await slack
    .auth(`Bearer ${authToken}`)
    .query({
      user: userId,
      include_locale: true,
    })
    .get('/users.info')
    .json(ZUserInfoResponse.parse);

    const locale = preferences.locale;
    const timeZone = preferences.tz;

    const bot = {
      ...bot,
      locale,
      timeZone,
      getScheduledAt: () => {
        if (!bot.schedule) return;
  
        const cron = parseCronExpression(bot.schedule.cron);
        return getValidCronTime(cron);
      },
    }
}

/**
 * Register Slack Bot
 * @see https://api.slack.com/methods/oauth.v2.access
 */
export const registerBot = async (code: string) => {
  const authToken = btoa(`${config.SLACK_CLIENT_ID}:${config.SLACK_CLIENT_SECRET}`);

  const botData = await slack
    .addon(FormUrlAddon)
    .auth(`Bearer ${authToken}`)
    .formUrl({
      code,
      redirect_uri: config.REGISTRATION_URL,
    })
    .post('', '/oauth.v2.access')
    .json((response) => {
      if (!response.ok) {
        throw new SlackError('Registration Failed', { cause: response.error });
      }

      return ZRegistrationResponse.parse(response);
    });

    await db.insertBot({
      id: '',
      uid: botData.bot_user_id,
      team_id: botData.team.id,
      channel_id: botData.incoming_webhook.channel_id,
      token: botData.access_token,
      scope: botData.scope,
      webhook_url: botData.incoming_webhook.url,
    })
};

class SlackError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);

    this.name = 'SlackError';
  }
}
