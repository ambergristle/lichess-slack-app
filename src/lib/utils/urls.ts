
export const constructHref = (
  baseUrl: string, 
  params?: Record<string, string>,
) => {
  const url = new URL(baseUrl);
    
  if (!params) return url.href;

  Object
    .entries(params)
    .forEach(([key, value]) => {
      /** @todo error handling */
      if (typeof value !== 'string') {
        throw new Error(`Invalid parameter type ${typeof value}`);
      }
      
      url.searchParams.set(key, value);
    });

  return url.href;
};
