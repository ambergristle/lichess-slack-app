import wretch from 'wretch';
import FormUrlAddon from 'wretch/addons/formUrl';
import QueryStringAddon from 'wretch/addons/queryString';

import config from '../../config';
import { SlackError } from '../errors';
import { constructHref } from '../utils';
import { slackRequestFactory } from './utils';

export const constructHref = (
  baseUrl: string,
  params?: Record<string, string>,
) => {
  const url = new URL(baseUrl);

  if (!params) return url.href;

  Object
    .entries(params)
    .forEach(([key, value]) => {
      /** @todo error handling */
      if (typeof value !== 'string') {
        throw new Error(`Invalid parameter type ${typeof value}`);
      }

      url.searchParams.set(key, value);
    });

  return url.href;
};


/**
* @see https://api.slack.com/authentication/oauth-v2#asking
*/
export const generateOAuthRedirectUrl = () => {
  const APP_SCOPES = [
    'commands',
    'incoming-webhook',
    'users:read',
  ];

  return constructHref('https://slack.com/oauth/v2/authorize', {
    client_id: config.SLACK_CLIENT_ID,
    scope: APP_SCOPES.join(),
    state: config.STATE,
    redirect_uri: config.REGISTRATION_URL,
  });
};



const SlackApi = wretch('https://slack.com/api')
  .addon(QueryStringAddon);


/**
 * @see https://api.slack.com/types/user
 */
const ZUserInfoResponse = z.object({
  user: z.object({
    tz: z.string(),
    tz_label: z.string(),
    tz_offset: z.number(),
    locale: z.string(),
  }),
});

const parseUserInfoResponse: Parser<UserInfoResponse> = parserFactory(
  ZUserInfoResponse,
  {
    entityName: 'UserInfoResponse',
    errorMessage: 'Recieved unprocessable response from Slack API',
  },
);

/**
 * @note Locale is only included if specified in request search params
 */
export const parseUserInfo: Parser<UserInfo> = (data) => {
  const { user } = parseUserInfoResponse(data);

  return {
    tz: user.tz,
    tzLabel: user.tz_label,
    tzOffset: user.tz_offset,
    locale: user.locale,
  };
};


export const getUserInfo = slackRequestFactory(async (token: string, userId: string) => {
  return await SlackApi
    .auth(`Bearer ${token}`)
    .query({
      user: userId,
      include_locale: true,
    })
    .get('/users.info')
    .json(parseUserInfo);
});


/**
 * Scope-dependent
 * @see https://api.slack.com/methods/oauth.v2.access
 */
const ZRegistrationResponse = z.object({
  bot_user_id: z.string(),
  access_token: z.string(),
  scope: z.string(),
  team: z.object({
    id: z.string(),
  }),
  incoming_webhook: z.object({
    channel_id: z.string(),
    url: z.string(),
  }),
});

const parseRegistrationResponse: Parser<RegistrationResponse> = parserFactory(
  ZRegistrationResponse,
  {
    entityName: 'RegistrationResponse',
    errorMessage: 'Recieved unprocessable response from Slack API',
  },
);

export const parseRegistrationData: Parser<RegistrationData> = (data) => {
  const response = parseRegistrationResponse(data);

  return {
    uid: response.bot_user_id,
    token: response.access_token,
    scope: response.scope.split(','),
    teamId: response.team.id,
    channelId: response.incoming_webhook.channel_id,
    webhookUrl: response.incoming_webhook.url,
  };
};



export const registerBot = slackRequestFactory(async (code: string) => {
  /** @see https://api.slack.com/methods/oauth.v2.access */
  const authToken = btoa(`${config.SLACK_CLIENT_ID}:${config.SLACK_CLIENT_SECRET}`);

  return await SlackApi
    .addon(FormUrlAddon)
    .auth(`Basic ${authToken}`)
    .formUrl({
      code,
      redirect_uri: config.REGISTRATION_URL,
    })
    .post('', '/oauth.v2.access')
    .json((response) => {
      if (!response.ok) {
        throw new SlackError('Registration Failed', {
          code: response.error,
        });
      }

      return parseRegistrationData(response);
    });
});

export const unregisterBot = slackRequestFactory(async (token: string) => {
  /** @todo flesh out flow */
  return await SlackApi
    .query({ token })
    .post('/auth.revoke')
    .json();
});





import type { KnownBlock } from '@slack/web-api';


/**
 * @see https://api.slack.com/interactivity/slash-commands#responding_immediate_response
 * @see https://api.slack.com/block-kit
 */
export const blocks = {
  divider: () => {
    return {
      type: 'divider',
    };
  },
  image: (props: { title: string; href: string; alt: string; }) => {
    return {
      type: 'image',
      title: {
        type: 'plain_text',
        text: props.title,
      },
      image_url: props.href,
      alt_text: props.alt,
    };
  },
  section: (props: { text: string; }) => {
    return {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: props.text,
      },
    };
  },
  // eslint-disable-next-line
} satisfies Record<string, ((...args: any[]) => KnownBlock)>;