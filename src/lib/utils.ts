

export const constructHref = (
  baseUrl: string, 
  params?: Record<string, string>
) => {
  const url = new URL(baseUrl);
    
  if (!params) return url.href;

  Object
    .entries(params)
    .forEach(([key, value]) => {
      if (typeof value !== 'string') throw `Invalid parameter type ${typeof value}`;
      url.searchParams.set(key, value);
    });

  return url.href;
};

export const unix = {
  fromDate: (date: Date) => {
    return `${Math.floor(date.valueOf() / 1000)}`
  },
  toDate: (timestamp: string) => {
    const epochSeconds = Number(timestamp);
    if (Object.is(NaN, epochSeconds)) throw new Error('Invalid timestamp');
    return epochSeconds * 1000
  }
}



// import { zonedTimeToUtc, utcToZonedTime } from 'date-fns-tz'

// const stripTimezone = () => {
//   return zonedTimeToUtc(date, timeZone)
// }

// const setTimezone = () => {
//   return utcToZonedTime(date, timeZone)
// }
