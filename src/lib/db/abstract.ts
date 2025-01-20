import { Bot, Schedule } from '@/lib/types';

type MaybePromise<T> = T | Promise<T>;

abstract class Db {
  abstract insertBot(data: Bot): MaybePromise<Bot>;

  abstract getBot(teamId: string): MaybePromise<Bot | null>;

  abstract setBotSchedule(teamId: string, schedule: Schedule): MaybePromise<void>;

  abstract deleteBot(teamId: string): MaybePromise<void>;
}

export default Db;
