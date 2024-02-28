import config from '@/config'
import wretch from 'wretch'
import { z } from 'zod'
import { parserFactory } from '../utils'

const QStash = wretch('https://qstash.upstash.io/v2')

const ZCreateScheduleResponse = z.object({
  scheduleId: z.string(),
})

const parseCreateScheduleResponse = parserFactory(
  ZCreateScheduleResponse,
  {
    entityName: 'CreateScheduleResponse',
    errorMessage: 'Recieved invalid response'
  }
)

type CreateScheduleOptions = {
  service: string;
  cron: string;
  data: Record<string, unknown>;
}

/**
 * @see https://upstash.com/docs/qstash/api/schedules/create
 */
export const createSchedule = async ({
  service,
  cron,
  data
}: CreateScheduleOptions) => {
  // Upstash-Forward-My-Header
  return  await QStash
    .auth(`Bearer ${config.QSTASH_TOKEN}`)
    .headers({ 
      'upstash-cron': cron
    })
    .post(data, `/schedules/${config.BASE_URL}${service}`)
    .json(parseCreateScheduleResponse)
}

export const deleteSchedule = async (scheduleId: string) => {
  await QStash
    .auth(`Bearer ${config.QSTASH_TOKEN}`)
    .delete(`/schedules/${scheduleId}`)
    .res()
}
