import type { PlainTextOption } from '@slack/web-api';

import { SUPPORTED_TIME_ZONES } from '@/locale/time-zones';


/**
 * The scopes required by the app, requested on registration.
 */
export const APP_SCOPE = [
  'commands',
  'incoming-webhook',
  'channels:read',
  'users:read',
].join(',');


export const OAUTH_STATE_COOKIE_NAME = 'lsa_auth_state';

/**
 * @deprecated Keeping this around in case manual timezone
 * configuration comes back into play
 */
export const TIME_ZONE_OPTIONS = SUPPORTED_TIME_ZONES
  .map((timeZone): PlainTextOption => ({
    text: {
      type: 'plain_text',
      text: timeZone,
    },
    value: timeZone,
  }));
