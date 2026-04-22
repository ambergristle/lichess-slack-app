import { z } from 'zod';

const ZAction = z.object({
  action_id: z.string(),
  block_id: z.string(),
  type: z.string(),
});

const ZButtonAction = ZAction.extend({
  type: z.literal('button'),
  value: z.string(),
}).transform((action) => ({
  actionId: action.action_id,
  blockId: action.block_id,
  type: action.type,
  value: action.value,
}));

/**
 * @see https://api.slack.com/reference/block-kit/block-elements#timepicker
 */
const ZTimePickerAction = ZAction.extend({
  type: z.literal('timepicker'),
  selected_time: z
    .string()
    .trim()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
}).transform((action) => {
  const timeStrings = action.selected_time.split(':');

  // Regex enforces string shape (HH:MM)
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const hourString = timeStrings[0]!;
  // eslint-disable-next-line
  const minuteString = timeStrings[1]!;

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

/**
 * @see https://api.slack.com/reference/interaction-payloads/block-actions
 */
const ZInteractivePayload = z
  .object({
    api_app_id: z.string(),
    channel: z.object({
      id: z.string(),
    }),
    user: z.object({
      id: z.string(),
    }),
    actions: z.tuple([z.union([ZButtonAction, ZTimePickerAction])]),
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
const unwrapInteractiveRequest = z
  .object({
    payload: z.string(),
  })
  .transform(({ payload }) => {
    return JSON.parse(payload);
  }).parse;

export const ZInteractiveRequestBody = z.preprocess(unwrapInteractiveRequest, ZInteractivePayload);

/**
 * @see https://api.slack.com/interactivity/slash-commands#app_command_handling
 */
export const ZSlashCommandBody = z
  .object(
    {
      api_app_id: z.string(), // <- ?
      channel_id: z.string(),
      user_id: z.string(),
      command: z.string(),
      text: z.string(),
      response_url: z.string(),
    },
    {
      message: 'Recieved unprocessable request',
    },
  )
  .transform((body) => ({
    appId: body.api_app_id,
    channelId: body.channel_id,
    userId: body.user_id,
    command: body.command,
    text: body.text,
    responseUrl: body.response_url,
  }));

export const ZRegistrationRequest = z.object(
  {
    code: z.string(),
    state: z.string(),
  },
  { message: 'Recieved unprocessable request' },
);

export const ZAccessResponse = z.discriminatedUnion('ok', [
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
