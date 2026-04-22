import { z } from 'zod';

// #region OAuth Grant Flow

export const zOAuthAccessResponseBody = z.discriminatedUnion('ok', [
  z.object({
    ok: z.literal(true),
    app_id: z.string(),
    bot_user_id: z.string(),
    scope: z.string(),
    incoming_webhook: z.object({
      channel_id: z.string(),
      url: z.string(),
    }),
    access_token: z.string(),
  }),
  z.object({
    ok: z.literal(false),
    error: z.string(),
  }),
]);

// #endregion

// #region Slash Commands

/** @see https://api.slack.com/interactivity/slash-commands#app_command_handling */
export const zSlashCommandRequestBody = z
  .object({
    api_app_id: z.string(),
    channel_id: z.string(),
    user_id: z.string(),
    command: z.string(),
    text: z.string(),
    response_url: z.string(),
  })
  .transform((body) => ({
    appId: body.api_app_id,
    channelId: body.channel_id,
    userId: body.user_id,
    command: body.command,
    text: body.text,
    responseUrl: body.response_url,
  }));

// #endregion

// #region Interactions

const zAction = z.object({
  action_id: z.string(),
  block_id: z.string(),
  type: z.string(),
});

const zButtonAction = zAction
  .extend({
    type: z.literal('button'),
    value: z.string(),
  })
  .transform((action) => ({
    actionId: action.action_id,
    blockId: action.block_id,
    type: action.type,
    value: action.value,
  }));

/** @see https://api.slack.com/reference/block-kit/block-elements#timepicker */
const zTimePickerAction = zAction
  .extend({
    type: z.literal('timepicker'),
    selected_time: z
      .string()
      .trim()
      .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  })
  .transform((action) => {
    const timeStrings = action.selected_time.split(':');

    // String shape (HH:MM) enforced by regex
    const hourString = timeStrings[0];
    const minuteString = timeStrings[1];

    return {
      actionId: action.action_id,
      blockId: action.block_id,
      type: action.type,
      selectedTime: {
        hour: Number(hourString),
        minute: Number(minuteString),
      },
    };
  });

/** @see https://api.slack.com/reference/interaction-payloads/block-actions */
const zInteractivePayload = z
  .object({
    api_app_id: z.string(),
    channel: z.object({
      id: z.string(),
    }),
    user: z.object({
      id: z.string(),
    }),
    actions: z.tuple([z.union([zButtonAction, zTimePickerAction])]),
    response_url: z.string(),
  })
  .transform((payload) => ({
    appId: payload.api_app_id,
    channelId: payload.channel.id,
    userId: payload.user.id,
    actions: payload.actions,
    responseUrl: payload.response_url,
  }));

/** @see https://api.slack.com/interactivity/handling#payloads */
export const zInteractiveRequestBody = z.preprocess(
  z.object({ payload: z.string() }).transform(({ payload }) => {
    return JSON.parse(payload);
  }).parse,
  zInteractivePayload,
);

// #endregion
