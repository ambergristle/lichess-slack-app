import { KnownError } from '@/lib/errors';

const browsers = [
  'Mozilla',
  'AppleWebKit',
  'Chrome',
  'Safari',
  'Edge',
];

export const getIsBrowser = (headers: Headers) => {
  const accepts = headers.get('accepts');
  const userAgent = headers.get('user-agent');

  if (userAgent) {
    const isBrowserAgent = browsers.some((browser) => {
      return userAgent?.includes(browser);
    });

    return isBrowserAgent;
  }

  if (accepts) return accepts.includes('html');

  return false;
};

export const logError = (error: unknown) => {
  if (error instanceof KnownError) {
    console.error(error.json());
  } else {
    console.error(error);
  }
};
