import wretch from 'wretch';
import { z } from 'zod';

import config from '@/config';


const callbackUrl = `${config.BASE_URL}/api/deliver`;

const qStash = wretch('https://qstash.upstash.io/v2');


const ZCreateScheduleResponse = z.object({
  scheduleId: z.string(),
}, {
  message: 'Recieved invalid response',
});

/**
 * @see https://upstash.com/docs/qstash/api/schedules/create
 */
export const createSchedule = async ({
  url,

  data,
}: {
  url: string;
  cron: string;
  data: Record<string, unknown>;
}): Promise<{ scheduleId: string; }> => {

  if (bot.schedule) {
    await deleteSchedule(bot.schedule.scheduleId);
  }

    // so we get hours and minutes, we assume in user's tz
  const { tz: timeZone } = await getUserInfo(authToken, bot.userId)

  const cronData = zonedTimeToUtc(selectedTime, timeZone);
  const cron = stringifyCron(cronData);

  // Upstash-Forward-My-Header
  const { scheduleId } = await qStash
    .auth(`Bearer ${config.QSTASH_TOKEN}`)
    .headers({
      'upstash-cron': cron,
    })
    .post({
      botId: bot.id,
      locale,
    }, `/schedules/${url}`)
    .json(ZCreateScheduleResponse.parse);

  /** @todo db retry or session */
  await db.scheduleBot(bot.teamId, {
    scheduleId,
    cron,
  });
};






export const deleteSchedule = async (scheduleId: string) => {
  await qStash
    .auth(`Bearer ${config.QSTASH_TOKEN}`)
    .delete(`/schedules/${scheduleId}`)
    .res();
};




/**
 * @see https://upstash.com/docs/qstash/api/schedules/create
 */
export const setSchedule = async (locale: string, timeZone: string) => {

  const cronData = zonedTimeToUtc(selectedTime, bot.timeZone);
  const cron = stringifyCron(cronData);

  if (bot.schedule) {
    await qStash
      .auth(`Bearer ${config.QSTASH_TOKEN}`)
      .delete(`/schedules/${bot.schedule.scheduleId}`)
      .res();
  }

  /**
   * @see https://upstash.com/docs/qstash/api/schedules/create
   */

  // Upstash-Forward-My-Header
  const { scheduleId } = await qStash
    .auth(`Bearer ${config.QSTASH_TOKEN}`)
    .headers({
      'upstash-cron': cron,
    })
    .post({
      botId: bot.id,
      locale,
    }, `/schedules/${url}`) // todo
    .json(ZCreateScheduleResponse.parse);

  // todo: db retry or session
  await db.scheduleBot(bot.teamId, {
    scheduleId,
    cron,
  });

  return {
    scheduledAt
  }
}