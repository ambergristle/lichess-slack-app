import { Localizations } from '@/locale/types';

const filePaths: Record<string, 'en_us'> = {
  'en,en-US': 'en_us',
};

const localeKeys = Object.keys(filePaths);

export const getLocalizations = async (
  locale: string,
): Promise<Localizations> => {
  const preferredLocaleKey = localeKeys.find((key) => {
    return key.includes(locale);
  });

  const filePath = filePaths[preferredLocaleKey ?? ''] ?? 'en_us';

  return await import(`@/locale/${filePath}`)
    .then((module) => module.default);
};

export const interpolate = (
  templateString: string,
  tokens: Record<string, string>,
) => {
  let interpolated = templateString;

  Object.entries(tokens).forEach(([key, value]) => {
    interpolated = interpolated.replace('${'+key+'}', value);
  });

  return interpolated;
};




import type pug from 'pug';

import { getLocalizations } from '@/lib/utils/locale';

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept-Language
 */
export const localize = async (
  template: pug.compileTemplate,
  locale: string,
  tokens?: Record<string, string>,
) => {
  const localizations = await getLocalizations(locale);

  return template({
    ...localizations,
    ...tokens,
  });
};
