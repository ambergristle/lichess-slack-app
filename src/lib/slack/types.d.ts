import type { KnownBlock } from '@slack/web-api';

/**
 * @see https://api.slack.com/interactivity/slash-commands#responding_immediate_response
 */
export type BlockResponse = {
  blocks: KnownBlock[];
};

export type RegistrationResponse = {
  bot_user_id: string;
  access_token: string;
  scope: string;
  team: {
    id: string;
  }
}

export type RegistrationData = {
  uid: string;
  token: string;
  scope: string[];
  teamId: string;
}

/**
 * @see @see https://api.slack.com/interactivity/slash-commands#app_command_handling
 */
export type SlashCommandRequest = {
  team_id: string;
  channel_id: string;
  user_id: string;
  command: string;
  text: string;
  token: string;
  api_app_id: string;
  response_url: string;
}

export type SlashCommandData = {
  teamId: string;
  channelId: string;
  userId: string;
  command: string;
  text: string;
  token: string;
  appId: string;
  responseUrl: string;
}

/**
 * @see https://api.slack.com/reference/interaction-payloads/block-actions
 */
export type TimePickerActionRequest = {
  team: {
    id: string;
  }
  user: {
    id: string;
  }
  actions: {
    action_id: string;
    block_id: string;
    selected_time: string;
  }[]
  response_url: string;
}

export type TimePickerData = {
  teamId: string;
  userId: string;
  selectedTime: string | undefined;
  responseUrl: string;
}

export type TriggerRegistrationRequest = {
  code: string;
  state: string;
}

/**
 * @see https://api.slack.com/types/user
 */
export type UserInfoResponse = {
  user: {
    tz: string;
    tz_label: string;
    tz_offset: number;
    locale: string;
  }
}

export type UserInfo = {
  tz: string;
  tzLabel: string;
  tzOffset: number;
  locale: string;
}