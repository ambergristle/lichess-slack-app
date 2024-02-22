
export type MaybePromise<T> = T | Promise<T>;

export type Bot = {
  uid: string;
  teamId: string;
  token: string;
  scope: string[];
  scheduledAt?: Date;
}
