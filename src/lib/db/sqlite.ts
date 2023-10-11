import { Database as BunSqlLiteDb } from "bun:sqlite";
import { serializeBot, parseBot, Bot } from "../../schemas";
import Db from "./abstract";

/**
 * @see https://bun.sh/docs/api/sqlite
 */

class SqliteDb implements Db {

  private db: BunSqlLiteDb;

  private constructor() {
    // const db = new Database("mydb.sqlite");
    this.db = new BunSqlLiteDb(":memory:");
    this.init()
  }

  private init() {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS bots (
        uid STRING PRIMARY KEY, 
        team_id STRING,
        token STRING,
        scope STRING
      )
    `)
  }

  public static connect() {
    return new SqliteDb();
  }

  public close() {
    this.db.close()
  }

  public createBot(data: Bot) {
    const botRecord = serializeBot(data);

    const result = this.db.query(`
      INSERT INTO bots (uid, team_id, token, scope)
      VALUES (:uid, :teamId, :token, :scope)
    `).get(botRecord)

    return parseBot(result)
  }

  public findBotByTeamId(teamId: string) {
    const result = this.db.query('SELECT * FROM bots WHERE team_id = :teamId').get({ teamId })
    // handle null case
    return parseBot(result)
  }

  public scheduleBotByTeamId(teamId: string, scheduledAt: Date) {
    const result = this.db.query(`
      UPDATE bots WHERE teamId = :teamId
      SET scheduled_at = :scheduledAt,
    `).get({ 
      teamId,
      // format?
      scheduledAt: scheduledAt.toISOString()
    })

    return parseBot(result)
  }

  public updateBotByTeamId(teamId: string) {}

  public deleteBotByTeamId(teamId: string) {
    const deleteBotQuery = this.db.query('DELETE FROM bots WHERE teamId = ?')
    const result = deleteBotQuery.get(teamId) // return?
    return parseBot(result)
  }
}

export default SqliteDb