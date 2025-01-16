import { parseCronExpression } from '@/lib/cron/whatever';
import db from '@/lib/db';
import { PersistenceError } from '@/lib/errors';
import { getUserInfo } from '@/lib/slack';

const getValidCronTime = (cron: CronData | undefined) => {
  const { hour, minute } = cron ?? {};

  if (!isNumber(hour) || !isNumber(minute)) return;
  return { hour, minute };
};


export const getBotContext = async (teamId: string, userId: string) => {

  const bot = await db.getBot(teamId);
  if (!bot) throw new PersistenceError('Bot not found', {
    code: 'not_found',
    collection: 'bots',
    op: 'read',
    filter: { teamId },
  });

  const preferences = await getUserInfo(bot.token, userId);

  const locale = preferences.locale;
  const timeZone = preferences.tz;

  return {
    ...bot,
    locale,
    timeZone,
    getScheduledAt: () => {
      if (!bot.schedule) return;

      const cron = parseCronExpression(bot.schedule.cron);
      return getValidCronTime(cron);
    },
  };
};
