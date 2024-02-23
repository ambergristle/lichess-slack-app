import { Bot } from '@/types';
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

  public scheduleBot(teamId: string, scheduledAt: Date) {
    return this.db.scheduleBot(teamId, scheduledAt);
  }

  public deleteBot(teamId: string) {
    return this.db.deleteBot(teamId);
  }
  
}

/** @todo db swap */
export default new Service(SqliteDb.connect());
