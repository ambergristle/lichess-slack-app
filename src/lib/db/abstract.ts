import { Bot } from "../../schemas";

type MaybePromise<T> = T | Promise<T>;

abstract class Db {
  abstract addBot(data: Bot): MaybePromise<Bot>;

  abstract getBot(teamId: string): MaybePromise<Bot | null>;

  abstract scheduleBot(teamId: string, scheduledAt: Date): MaybePromise<void>;

  abstract deleteBot(teamId: string): MaybePromise<void>;
}

export default Db
