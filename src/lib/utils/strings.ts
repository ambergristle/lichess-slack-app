
export const interpolate = (templateString: string, tokens: Record<string, any>) => {
  let interpolated = templateString;

  Object.entries(tokens).forEach(([key, value]) => {
    interpolated = interpolated.replace('${'+key+'}', value);
  });

  return interpolated;
};
