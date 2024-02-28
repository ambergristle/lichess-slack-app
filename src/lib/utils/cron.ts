import { z } from 'zod';

import { parserFactory } from './zod';
import { isNumber, isString } from './types';

type CronData = {
  /** 0-59 */
  minute?: number;
  /** 0-23 */
  hour?: number;
  /** 1-31 */
  day?: number;
  /** 1-12 */
  month?: number;
  /** 0-6 */
  weekday?: number;
}

const cronProps = ['minute', 'hour', 'day', 'month', 'weekday'] as const;

const ZCronData = z.object({
  minute: z.number().min(0).max(59).optional(),
  hour: z.number().min(0).max(23).optional(),
  day: z.number().min(1).max(31).optional(),
  month: z.number().min(1).max(12).optional(),
  weekday: z.number().min(0).max(6).optional(),
});

const parseCronData = parserFactory(
  ZCronData,
  {
    entityName: 'CronExpression',
    errorMessage: 'Invalid Cron Expression',
  },
);

export const toCron = (data: CronData) => {
  const expression = parseCronData(data);

  return cronProps.map((prop) => {
    const value = expression[prop];

    return isNumber(value)
      ? value.toString().padStart(2, '0')
      : '*';
  }).join(' ');
};

/** todo *\/2 */
const CronRegex = /^(\*|[0-5]?\d)\s(\*|[01]?\d|2[0-3])\s(\*|[0-2]?\d|3[01])\s(\*|0?[1-9]|1[0-2])\s(\*|0?[0-6])$/;

const isValidCron = (arg: unknown): arg is string => {
  return isString(arg) && CronRegex.test(arg);
};

export const fromCron = (cronString: string): CronData => {
  if (!isValidCron(cronString)) {
    /** @todo error handling */
    throw new Error('Invalid cron string');
  }

  const expression = cronString
    .split(' ')
    .reduce((cron: CronData, value, index) => {
      const cronProp = cronProps[index];
      if (!cronProp) throw new Error('Invalid Cron String');
      if (value !== '*') cron[cronProp] = Number(value);
      return cron;
    }, {
      minute: undefined,
      hour: undefined,
      day: undefined,
      month: undefined,
      weekday: undefined,
    });

  return parseCronData(expression);
};

export const getValidCronTime = (cron: CronData | undefined) => {
  const { hour, minute } = cron ?? {};

  if (!isNumber(hour) || !isNumber(minute)) return;
  return { hour, minute };
};
