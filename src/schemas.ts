import { z } from "zod";

export type Bot = {
  uid: string;
  teamId: string;
  token: string;
  scope: string[];
  scheduledAt?: Date;
}

export const ZBot = z.object({
  uid: z.string(),
  teamId: z.string(),
  token: z.string(),
  scope: z.string().array(),
  scheduledAt: z.date().optional(),
})
