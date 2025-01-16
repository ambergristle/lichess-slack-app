
export type NonNullable<T> = T & {};

export type MaybePromise<T> = T | Promise<T>;



export type Parser<T> = (data: unknown) => T;

export const isNumber = (arg: unknown): arg is number => {
  return typeof arg === 'number' && !isNaN(arg);
};

export const isString = (arg: unknown): arg is string => {
  return typeof arg === 'string';
};


export type DailyPuzzle = {
  puzzleUrl: string;
  puzzleThumbUrl: string;
}


export type Schedule = {
  scheduleId: string;
  cron: string;
}

export type Bot = {
  uid: string;
  teamId: string;
  channelId: string;
  scope: string[];
  token: string;
  webhookUrl: string;
  schedule?: Schedule;
}
