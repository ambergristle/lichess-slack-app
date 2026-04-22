import { describe, expect, test } from 'bun:test';
import {
  formatCronExpression,
  localizeUtc,
  parseCronTime,
  zonedToUtc,
} from './cron';

describe('CRON Utils', () => {
  describe('formatCronExpression', () => {
    const cases: [{ hour?: number; minute?: number; day?: number }, string][] =
      [
        [{ hour: 0, minute: 0 }, '00 00 * * *'],
        [{ hour: 12, minute: 0 }, '00 12 * * *'],
        [{ hour: 0, minute: 30 }, '30 00 * * *'],
        [{ day: 1 }, '* * 01 * *'],
      ];

    test('Generate CRON expression', () => {
      for (const [args, expected] of cases) {
        const actual = formatCronExpression(args);
        expect(actual).toEqual(expected);
      }
    });
  });

  describe('localizeUtc', () => {
    test('Localize and format UTC time', () => {
      const cases: [
        [{ hour: number; minute: number }, string, string],
        { display: string; defaultValue: string },
      ][] = [
        [
          [{ hour: 0, minute: 0 }, 'Europe/Paris', 'en-US'],
          {
            display: '2:00 AM',
            defaultValue: '02:00',
          },
        ],
        [
          [{ hour: 0, minute: 0 }, 'America/Los_Angeles', 'en-US'],
          {
            display: '5:00 PM',
            defaultValue: '17:00',
          },
        ],
      ];

      for (const [args, expected] of cases) {
        const actual = localizeUtc(...args);
        expect(actual).toEqual(expected);
      }
    });
  });

  describe('parseCronTime', () => {
    test('Parse CRON expression', () => {
      const cases: [string, { hour: number; minute: number }][] = [
        ['00 00 * * *', { hour: 0, minute: 0 }],
        ['00 12 * * *', { hour: 12, minute: 0 }],
        ['30 00 * * *', { hour: 0, minute: 30 }],
      ];

      for (const [arg, expected] of cases) {
        const actual = parseCronTime(arg);
        expect(actual).toEqual(expected);
      }
    });
  });

  describe('zonedToUtc', () => {
    test('Convert zoned to UTC time', () => {
      const cases: [
        [{ hour: number; minute: number }, string],
        { hour: number; minute: number },
      ][] = [
        [[{ hour: 0, minute: 0 }, 'Europe/Paris'], { hour: 22, minute: 0 }],
        [
          [{ hour: 0, minute: 0 }, 'America/Los_Angeles'],
          { hour: 7, minute: 0 },
        ],
      ];

      for (const [args, expected] of cases) {
        const actual = zonedToUtc(...args);
        expect(actual).toEqual(expected);
      }
    });
  });
});
