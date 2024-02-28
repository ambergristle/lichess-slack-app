
export type MaybePromise<T> = T | Promise<T>;

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
