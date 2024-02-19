import { z } from 'zod'

/** @todo where do these live? */

// parse Accept-Language header?
// could use Intl.DateTimeFormat but won't know locale until runtime
export const timeResponseData = (date: Date | undefined, timeZone: string) => {
  /** @todo locale */
  const timeString = date?.toLocaleTimeString([], {
    timeZone,
    hour: '2-digit',
    minute: '2-digit'
  })

  const message = timeString
    ? `Your are scheduled to recieve the next puzzle at ${timeString}.`
      + ' You can update or cancel at any time:'
    : 'Select a time to recieve the Lichess Daily Puzzle';

  return {
    message,
    initialTime: timeString ?? '12:00',
  }
}

/** @todo locale */
const getLocaleDateTime = (date: Date, timeZone: string) => {
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

/** 
 * Accepts string of H:MM or HH:MM and returns
 * hours and minutes as integers
 */
export const parseTimeString = (args: string | undefined) => {
  
  const result = z
    .string()
    .trim()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .safeParse(args)

  if (!result.success) {
    console.error(result.error);
    throw new Error('Invalid time string')
  }

  const [hoursString, minutesString] = result.data.split(':');

  const hours = Number(hoursString)
  const minutes = Number(minutesString)

  if (isNaN(hours) || isNaN(minutes)) throw new Error()

  return { 
    hours, 
    minutes 
  }
}
