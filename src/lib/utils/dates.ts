import zonedToUtc from 'date-fns-tz/zonedTimeToUtc';
import utcToZoned from 'date-fns-tz/utcToZonedTime';

export const unix = {
  fromDate: (date: Date) => {
    return `${Math.floor(date.valueOf() / 1000)}`;
  },
  toDate: (timestamp: string) => {
    const epochSeconds = Number(timestamp);
    if (isNaN(epochSeconds)) throw new Error('Invalid timestamp');
    return epochSeconds * 1000;
  },
};

const padDigits = (num: number) => {
  return num.toString().padStart(2, '0');
}

export const zonedTimeToUtc = (
  { hours, minutes }: { hours:  number; minutes: number; }, 
  timeZone: string
) => {
  const hh = padDigits(hours);
  const mm = padDigits(minutes);

  const dateTimeString = `2024-12-31T${hh}:${mm}:00.000`;
  const utcDate = zonedToUtc(dateTimeString, timeZone);

  return {
    hour: utcDate.getUTCHours(),
    minute: utcDate.getUTCMinutes(),
  };
};

export const getRawTimeString = (date: Date) => {
  return date
    .toLocaleTimeString(['en-US'], {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
    })
}

export const utcTimeToZoned = (
  { hours, minutes }: { hours:  number; minutes: number; }, 
  timeZone: string
) => {
  const hh = padDigits(hours);
  const mm = padDigits(minutes);

  const dateTimeString = `1969-12-31T${hh}:${mm}:00.000Z`;
  const zonedDate = utcToZoned(dateTimeString, timeZone);

  const [hoursDigits, minutesDigits] = getRawTimeString(zonedDate)
    .split(':');

  return {
    hours: Number(hoursDigits),
    minutes: Number(minutesDigits),
  };
}

export const localizeZonedTime = (
  { hour, minute }: { hour:  number; minute: number; },
  timeZone: string,
  locale: string,
) => {
  const hh = padDigits(hour);
  const mm = padDigits(minute);

  const dateTimeString = `2024-12-31T${hh}:${mm}:00.000`;
  const utcDate = zonedToUtc(dateTimeString, timeZone);

  return utcDate.toLocaleTimeString(locale, {
    timeZone,
    timeStyle: 'short',
  });
};

export const formatTimeInput = ({ hour, minute }: { hour:  number; minute: number; }) => {
  const hh = padDigits(hour);
  const mm = padDigits(minute);

  const dateTimeString = `1969-12-31T${hh}:${mm}:00.000Z`;
  return getRawTimeString(new Date(dateTimeString))
}
