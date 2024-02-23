import { Localizations } from '@/locale/types';

const filePaths: Record<string, 'en_us'> = {
  'en,en-US': 'en_us',
}

const localeKeys = Object.keys(filePaths)

export const getLocalizations = async (locale: string): Promise<Localizations> => {
  const preferredLocaleKey = localeKeys.find((key) => {
    return key.includes(locale)
  });

  const filePath = filePaths[preferredLocaleKey ?? ''] ?? 'en_us';

  return await import(`@/locale/${filePath}`)
    .then((module) => module.default);
}
