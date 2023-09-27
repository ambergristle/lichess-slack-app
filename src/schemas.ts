import { z } from "zod";
import { unix } from "./utils";

export type Bot = {
  uid: string;
  teamId: string;
  token: string;
  scope: string[];
  scheduledAt?: Date;
}

const ZBot = z.object({
  uid: z.string(),
  teamId: z.string(),
  token: z.string(),
  scope: z.string().array(),
  scheduledAt: z.date().optional(),
})

const ZBotRead = ZBot.extend({
  scope: z.string()
    .transform((value) => value.split(','))
})

export const parseBot = (bot: unknown) => {
  return ZBotRead.parse(bot)
}

const ZBotWrite = ZBot.extend({
  scope: ZBot.shape.scope
    .transform((value) => value.join()),
  scheduledAt: ZBot.shape.scheduledAt
    .transform((date) => date?.toISOString())
})

export const serializeBot = (bot: Bot) => {
  ZBot.transform((bot) => ({
    ...bot,
    scope: bot.scope.join(),
    ...(bot.scheduledAt && {
      scheduledAt: bot.scheduledAt.toISOString()
    })
  }))



  return ZBotWrite.parse(bot)
}

export const serializePartialBot = (bot: Partial<Bot>) => {
  return ZBotWrite.extend({
    date: z.date().transform((date) => date.toISOString())
  })
}

const ZTimestamp = z.string().transform(unix.toDate)

const ZActionsRequest = z.object({
  actions: z.object({
    action_ts: z.string(),
    value: z.any(),
    type: z.string(),
  }).array()
});



type ActionsRequest = z.infer<typeof ZActionsRequest>;

const whatever = (request: ActionsRequest) => {
  const thing = request.actions.at(0)

  // checks?


}





const userResponse = z.object({
  user: z.object({
    tz: z.string(), // "America/Los_Angeles"
  })
})