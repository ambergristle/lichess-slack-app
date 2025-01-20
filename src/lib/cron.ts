import zonedToUtc from 'date-fns-tz/zonedTimeToUtc';
import utcToZoned from 'date-fns-tz/utcToZonedTime';
import { z } from 'zod';

import { isNumber, isString } from './types';


const CRON_FIELDS = [
  'minute',
  'hour',
  'day',
  'month',
  'weekday',
] as const;

// todo *\/2
// todo break up exp?
// eslint-disable-next-line
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


const parseCron = (expression: string): Cron => {
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

  return ZCron.parse(data);
};

export const parseCronTime = (expression: string): CronTime => {
  const { hour, minute } = parseCron(expression);
  if (!hour || !minute) {
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


const padDigits = (num: number) => {
  return num.toString().padStart(2, '0');
};

export const zonedCronTimeToUtc = (cronTime: CronTime, timeZone: string) => {
  const hh = padDigits(cronTime.hour);
  const mm = padDigits(cronTime.minute);

  const dateTimeString = `1969-12-31T${hh}:${mm}:00.000`;
  const utcDate = zonedToUtc(dateTimeString, timeZone);

  return {
    hour: utcDate.getUTCHours(),
    minute: utcDate.getUTCMinutes(),
  };
};


export const utcCronTimeToZoned = (cronTime: CronTime, timeZone: string) => {
  const hh = padDigits(cronTime.hour);
  const mm = padDigits(cronTime.minute);

  const dateTimeString = `1969-12-31T${hh}:${mm}:00.000Z`;
  const zonedDate = utcToZoned(dateTimeString, timeZone);

  const [hours, minutes] = zonedDate
    .toLocaleTimeString(['en-US'], {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      timeZone,
    }).split(':');

  // Values will never actually be undefined
  return {
    hour: Number(hours),
    minute: Number(minutes),
  };
};


export const localizeZonedCronTime = (
  cronTime: CronTime,
  timeZone: string,
  locale: string
) => {
  const hh = padDigits(cronTime.hour);
  const mm = padDigits(cronTime.minute);

  const dateTimeString = `1969-12-31T${hh}:${mm}:00.000`;
  const utcDate = zonedToUtc(dateTimeString, timeZone);

  return utcDate.toLocaleTimeString(locale, {
    timeZone,
    timeStyle: 'short',
  });
};
