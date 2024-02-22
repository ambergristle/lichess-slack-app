import { z } from 'zod'
import { parserFactory } from './utils';

/** @todo where do these live? */

/** @todo locale */
const getLocaleDateTime = (date: Date, timeZone: string) => {
  /** @todo error handling */
  return new Date(date.toLocaleString('en-US', {
    timeZone,
  }))
}

export const getScheduledTime = (hours: number, minutes: number, timeZone: string) => {
  const zonedDate = getLocaleDateTime(new Date(), timeZone)

  zonedDate.setDate(zonedDate.getDate() + 1)
  zonedDate.setHours(hours)
  zonedDate.setMinutes(minutes)
  zonedDate.setSeconds(0)
  zonedDate.setMilliseconds(0)

  return zonedDate
}

const ZTimeString = z
  .string()
  .trim()
  .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)

const parseTimeString = parserFactory(
  ZTimeString,
  {
    entityName: 'TimeString',
    errorMessage: 'Invalid TimeString'
  }
)

/** 
 * Accepts string of H:MM or HH:MM and returns
 * hours and minutes as integers
 */
export const parseScheduleData = (args: string | undefined) => {
  const timeString = parseTimeString(args)

  const [hoursString, minutesString] = timeString.split(':');

  return { 
    hours: Number(hoursString), 
    minutes: Number(minutesString),
  }
}
