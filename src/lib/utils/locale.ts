import { Localized } from '@/locale/types';

const filePaths: Record<string, 'en_us'> = {
  'en,en-US': 'en_us',
};

const localeKeys = Object.keys(filePaths);

export const getLocalized = async (locale: string): Promise<Localized> => {
  const preferredLocaleKey = localeKeys.find((key) => {
    return key.includes(locale);
  });

  const filePath = filePaths[preferredLocaleKey ?? ''] ?? 'en_us';

  return await import(`@/locale/${filePath}`).then((module) => module.default);
};

export const interpolate = (templateString: string, tokens: Record<string, string>) => {
  let interpolated = templateString;

  Object.entries(tokens).forEach(([key, value]) => {
    interpolated = interpolated.replace('${' + key + '}', value);
  });

  return interpolated;
};
