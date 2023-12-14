import { z } from 'zod'


const utcToZonedTime = (date: Date, timeZone: string) => {
  return new Date(date.toLocaleString('en-US', {
    timeZone,
  }))
}

export const getScheduledTime = (hours: number, minutes: number, timeZone: string) => {
  const zonedDate = utcToZonedTime(new Date(), timeZone)

  zonedDate.setDate(zonedDate.getDate() + 1)
  zonedDate.setHours(hours)
  zonedDate.setMinutes(minutes)
  zonedDate.setSeconds(0)
  zonedDate.setMilliseconds(0)

  return zonedDate
}

export const parseScheduleArguments = (args: string | undefined) => {
  /** 
   * https://stackoverflow.com/a/7536768
   * https://peteroupc.github.io/
   */
  const result = z
    .string()
    .trim()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .transform((timeString) => {
      return timeString.split(':')
    })
    .safeParse(args)

  if (!result.success) {
    console.error(result.error);
    throw new Error()
  }

  const [hoursString, minutesString] = result.data;

  const hours = Number(hoursString)
  const minutes = Number(minutesString)

  if (isNaN(hours) || isNaN(minutes)) throw new Error()

  return { 
    hours, 
    minutes 
  }
}
