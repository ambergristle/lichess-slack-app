
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