import { describe, expect, test } from 'bun:test';
import { hmac } from './hmac';

describe('HMAC', () => {
  test('createDigest', () => {
    const digest = hmac.createDigest('SECRET', 'data', 'base64url');
    expect(digest).toBe('yYUiGZWlO3WOkDVzU_JHvY94zjkjYCO5l0ucsw0P9wk');
  });

  test('compareDigests', () => {
    const cases: [[string, string], boolean][] = [
      [
        [
          'yYUiGZWlO3WOkDVzU_JHvY94zjkjYCO5l0ucsw0P9wk',
          'yYUiGZWlO3WOkDVzU_JHvY94zjkjYCO5l0ucsw0P9wk',
        ],
        true,
      ],
      [
        [
          'yYUiGZWlO3WOkDVzU_JHvY94zjkjYCO5l0ucsw0P9wk',
          'nYVBVjAzCc6i8Mf3-LqYuXD6uVOHA8PELZXhCZfej0c',
        ],
        false,
      ],
      [
        [
          'yYUiGZWlO3WOkDVzU_JHvY94zjkjYCO5l0ucsw0P9wk',
          '',
        ],
        false,
      ],
    ];

    for (const [args, expected] of cases) {
      const areEqual = hmac.compareDigests(...args);
      expect(areEqual).toBe(expected);
    }
  });
});
