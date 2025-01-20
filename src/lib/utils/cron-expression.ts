import { z } from 'zod';
import { isNumber, isString } from '../types';


const CRON_FIELDS = ['minute', 'hour', 'day', 'month', 'weekday'] as const;

// todo *\/2
// todo break up exp?
// eslint-disable-next-line
const CRON_REGEX = /^(\*|[0-5]?\d)\s(\*|[01]?\d|2[0-3])\s(\*|[0-2]?\d|3[01])\s(\*|0?[1-9]|1[0-2])\s(\*|0?[0-6])$/;

type CronData = z.infer<typeof ZCronData>;
const ZCronData = z.object({
  minute: z.number().min(0).max(59).optional(),
  hour: z.number().min(0).max(23).optional(),
  day: z.number().min(1).max(31).optional(),
  month: z.number().min(1).max(12).optional(),
  weekday: z.number().min(0).max(6).optional(),
}, {
  message: 'Invalid Cron Expression'
});


const validateCronExpression = (expression: string) => {
  return isString(expression) && CRON_REGEX.test(expression);
};


export const stringifyCron = (data: CronData): string => {
  const cronData = ZCronData.parse(data);

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

export const parseCron = (expression: string): CronData => {
  if (!validateCronExpression(expression)) {
    throw new Error('Invalid Cron Expression');
  }

  const data = expression
    .split(' ')
    .reduce((cron: CronData, value, index) => {
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

  return ZCronData.parse(data);
};