import { accepts } from 'hono/accepts';
import { createMiddleware } from 'hono/factory';

import { getLocalized } from '@/lib/locale';


export type LocaleEnv = {
  Variables: {
    localized: Awaited<ReturnType<typeof getLocalized>>;
  }
}

export const localizer = () => {
  return createMiddleware<LocaleEnv>(async (c, next) => {

    const locale = accepts(c, {
      header: 'Accept-Language',
      supports: ['en', 'en-US'],
      default: 'en-US',
      // match
    });

    const localized = await getLocalized(locale);

    c.set('localized', localized);

    await next();
  });
};
