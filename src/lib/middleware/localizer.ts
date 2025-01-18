import { accepts } from 'hono/accepts';
import { createMiddleware } from 'hono/factory';

import { Localized } from '@/locale/types';


const filePaths: Record<string, 'en_us'> = {
  'en,en-US': 'en_us',
};

const localeKeys = Object.keys(filePaths);

const getLocalized = async (
  locale: string,
): Promise<Localized> => {
  const preferredLocaleKey = localeKeys.find((key) => {
    return key.includes(locale);
  });

  // todo: no match?
  const filePath = filePaths[preferredLocaleKey ?? ''] ?? 'en_us';

  return await import(`@/locale/${filePath}`)
    .then((module) => module.default);
};


/**
 *
 * @returns
 */
export const localizer = () => {
  return createMiddleware<{
    Variables: {
      localized: Localized;
    }
  }>(async (c, next) => {

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
