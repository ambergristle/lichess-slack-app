import { z } from 'zod';

export type ScheduledDeliveryRequestBody = z.infer<typeof zScheduledDeliveryRequestBody>;

/**
 * Data included in the scheduled callback,
 * specifies everything required for puzzle delivery.
 * @see {scheduleJob}
 */
export const zScheduledDeliveryRequestBody = z.object({
  jobId: z.string(),
});