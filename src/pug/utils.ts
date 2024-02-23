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
