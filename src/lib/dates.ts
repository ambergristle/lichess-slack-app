

export const unixMilliseconds = (timestamp: string) => {
  const epochSeconds = Number(timestamp);
  if (isNaN(epochSeconds)) throw new Error('Invalid timestamp');
  return epochSeconds * 1000;
};

export const toUnix = (date: Date) => {
  return `${Math.floor(date.valueOf() / 1000)}`;
};
