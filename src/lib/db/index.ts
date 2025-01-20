import { Bot, Schedule } from '@/lib/types';
import Db from './abstract';
import SqliteDb from './sqlite';

class Service implements Db {

  private db: Db;

  constructor(db: Db) {
    this.db = db;
  }

  public addBot(data: Bot) {
    return this.db.addBot(data);
  }

  public getBot(teamId: string) {
    return this.db.getBot(teamId);
  }

  public setBotSchedule(teamId: string, schedule: Schedule) {
    return this.db.setBotSchedule(teamId, schedule);
  }

  public deleteBot(teamId: string) {
    return this.db.deleteBot(teamId);
  }

}

/** @todo db swap */
export default new Service(SqliteDb.connect());
