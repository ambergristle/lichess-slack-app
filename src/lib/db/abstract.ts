import { Bot, Schedule } from '@/types';

type MaybePromise<T> = T | Promise<T>;

abstract class Db {
  abstract addBot(data: Bot): MaybePromise<Bot>;

  abstract getBot(teamId: string): MaybePromise<Bot | null>;

  abstract scheduleBot(teamId: string, schedule: Schedule): MaybePromise<void>;

  abstract deleteBot(teamId: string): MaybePromise<void>;
}

export default Db;
