import { z } from "zod";

export const ZBot = z.object({
  uid: z.string(),
  teamId: z.string(),
  token: z.string(),
  scope: z.string().array(),
  scheduledAt: z.date().optional(),
})
