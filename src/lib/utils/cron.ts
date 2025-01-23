import { UTCDate } from '@date-fns/utc';
import { TZDate } from '@date-fns/tz';
import { formatInTimeZone } from 'date-fns-tz';
import { z } from 'zod';

import { isNumber, isString } from '../types';


const CRON_FIELDS = [
  'minute',
  'hour',
  'day',
  'month',
  'weekday',
] as const;

// todo *\/2
// eslint-disable-next-line -- Breaking up regex has problems of its own
const CRON_REGEX = /^(\*|[0-5]?\d)\s(\*|[01]?\d|2[0-3])\s(\*|[0-2]?\d|3[01])\s(\*|0?[1-9]|1[0-2])\s(\*|0?[0-6])$/;

type Cron = z.infer<typeof ZCron>;
const ZCron = z.object({
  minute: z.number().min(0).max(59).optional(),
  hour: z.number().min(0).max(23).optional(),
  day: z.number().min(1).max(31).optional(),
  month: z.number().min(1).max(12).optional(),
  weekday: z.number().min(0).max(6).optional(),
}, {
  message: 'Invalid Cron Expression',
});

export type CronTime = Required<Pick<Cron, 'hour' | 'minute'>>


const validateCronExpression = (expression: string) => {
  return isString(expression) && CRON_REGEX.test(expression);
};


export const parseCronTime = (expression: string): CronTime => {
  if (!validateCronExpression(expression)) {
    throw new Error('Invalid Cron Expression');
  }

  const data = expression
    .split(' ')
    .reduce((cron: Cron, value, index) => {
      const fieldName = CRON_FIELDS[index];

      if (!fieldName) {
        throw new Error('Invalid Cron Expression');
      }

      if (value !== '*') {
        cron[fieldName] = Number(value);
      }

      return cron;
    }, {
      minute: undefined,
      hour: undefined,
      day: undefined,
      month: undefined,
      weekday: undefined,
    });

  const { hour, minute } = ZCron.parse(data);

  if (hour === undefined || minute === undefined) {
    throw new Error(`Invalid Cron Time: ${expression}`);
  }

  return { hour, minute };
};


export const stringifyCron = (data: Cron): string => {
  const cronData = ZCron.parse(data);

  const expression = CRON_FIELDS.map((prop) => {
    const value = cronData[prop];

    return isNumber(value)
      ? value.toString().padStart(2, '0')
      : '*';
  }).join(' ');

  if (!validateCronExpression(expression)) {
    throw new Error('Invalid Cron Expression');
  }

  return expression;
};


/**
 *
 * @param zonedTime
 * @param timeZone
 * @param locale
 * @returns
 */
export const zonedToUtc = (
  { hour, minute }: CronTime,
  timeZone: string
) => {
  const tzDate = new TZDate(2010, 6, 20, hour, minute, 0, 0, timeZone);

  return {
    hour: tzDate.getUTCHours(),
    minute: tzDate.getUTCMinutes(),
  };
};


/**
 *
 * @param utcTime
 * @param timeZone
 * @param locale
 * @returns
 */
export const localizeUtc = (
  { hour, minute }: CronTime,
  timeZone: string,
  locale: string
) => {
  const utcDate = new UTCDate(2010, 6, 20, hour, minute, 0, 0);

  return {
    display: utcDate.toLocaleTimeString(locale, {
      timeZone,
      timeStyle: 'short',
    }),
    defaultValue: formatInTimeZone(utcDate, timeZone, 'HH:mm'),
  };
};


