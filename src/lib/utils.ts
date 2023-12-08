
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



import { zonedTimeToUtc, utcToZonedTime } from 'date-fns-tz'

const stripTimezone = () => {
  return zonedTimeToUtc(date, timeZone)
}

const setTimezone = () => {
  return utcToZonedTime(date, timeZone)
}