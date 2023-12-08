import { z } from "zod";

const Bot = z.object({
  uid: z.string(),
  teamId: z.string(),
  token: z.string(),
  scope: z.string().array(),
  scheduledAt: z.date().optional(),
})

export type Bot = z.infer<typeof Bot>
