import config from '@/config';
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

export const isDevRequest = (headers: Headers) => {
  const devSecret = headers.get('x-dev-secret')
  return devSecret === config.DEVELOPMENT_SECRET;
}

const locales = [
  'en',
  'en-US',
];

const defaultLocale = 'en-US';

export const getLocalePreference = (headers: Headers) => {
  const acceptLanguage = headers.get('accept-language');

  if (!acceptLanguage || acceptLanguage === '*') {
    return defaultLocale;
  }

  const preferences = acceptLanguage.split(';').at(0)?.split(',');
  const firstAvailablePreference = preferences?.find((preference) => {
    return locales.includes(preference);
  });

  return firstAvailablePreference ?? defaultLocale;
};

export const logError = (error: unknown) => {
  if (error instanceof KnownError) {
    console.error(error.json());
  } else {
    console.error(error);
  }
};
