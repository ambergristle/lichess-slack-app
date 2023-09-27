import Db from "./abstract";
import SqliteDb from "./sqlite";
import { Bot } from "../../schemas";


class Service {

  private db: Db;

  constructor(db: Db) {
    this.db = db;
  }

  public createBot(data: Bot) {
    return this.db.createBot(data)
  }

  public findBotByTeamId(teamId: string) {
    return this.db.findBotByTeamId(teamId)
  }

  public scheduleBotByTeamId(teamId: string, scheduledAt: Date) {
    return this.db.scheduleBotByTeamId(teamId, scheduledAt)
  }

  public deleteBotByTeamId(teamId: string) {
    return this.db.deleteBotByTeamId(teamId)
  }
  
}

export default new Service(SqliteDb.connect())