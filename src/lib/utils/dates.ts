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
};

const zonedTimeToUtc = (
  { hour, minute }: { hour: number; minute: number; },
  timeZone: string,
) => {
  const hh = padDigits(hour);
  const mm = padDigits(minute);

  const dateTimeString = `1969-12-31T${hh}:${mm}:00.000`;
  const utcDate = zonedToUtc(dateTimeString, timeZone);

  return {
    hour: utcDate.getUTCHours(),
    minute: utcDate.getUTCMinutes(),
  };
};

const getRawTimeString = (date: Date) => {
  return date
    .toLocaleTimeString(['en-US'], {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
    });
};

const utcTimeToZoned = (
  { hour, minute }: { hour: number; minute: number; },
  timeZone: string,
) => {
  const hh = padDigits(hour);
  const mm = padDigits(minute);

  const dateTimeString = `1969-12-31T${hh}:${mm}:00.000Z`;
  const zonedDate = utcToZoned(dateTimeString, timeZone);

  const [hours, minutes] = zonedDate
    .toLocaleTimeString(['en-US'], {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      timeZone,
    }).split(':');

  return {
    hour: Number(hours),
    minute: Number(minutes),
  };
};

const localizeZonedTime = (
  { hour, minute }: { hour: number; minute: number; },
  timeZone: string,
  locale: string,
) => {
  const hh = padDigits(hour);
  const mm = padDigits(minute);

  const dateTimeString = `1969-12-31T${hh}:${mm}:00.000`;
  const utcDate = zonedToUtc(dateTimeString, timeZone);

  return utcDate.toLocaleTimeString(locale, {
    timeZone,
    timeStyle: 'short',
  });
};

const formatTimeInput = ({ hour, minute }: { hour: number; minute: number; }) => {
  const hh = padDigits(hour);
  const mm = padDigits(minute);

  const dateTimeString = `1969-12-31T${hh}:${mm}:00.000Z`;

  return new Date(dateTimeString).toLocaleTimeString(['en-US'], {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  });
};
