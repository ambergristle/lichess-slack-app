import { Database as BunSqlLiteDb } from "bun:sqlite";
import { z } from 'zod';

import { Bot, ZBot } from "@/schemas";
import Db from "./abstract";

const sqliteToBot = (botData: unknown): Bot => {
  return z.object({
    uid: z.string(),
    team_id: z.string(),
    token: z.string(),
    scope: z.string(),
    scheduled_at: z.coerce.date().nullable(),
  }).transform((data) => ({
    uid: data.uid,
    teamId: data.team_id,
    token: data.token,
    scope: data.scope.split(','),
    ...(data.scheduled_at && {
      scheduledAt: data.scheduled_at
    })
  }))
  .parse(botData)
}

const botToSqlite = (bot: Bot) => {
  return ZBot.transform((bot) => ({
    uid: bot.uid,
    team_id: bot.teamId,
    token: bot.token,
    scope: bot.scope.join(','),
    ...(bot.scheduledAt && {
      scheduled_at: bot.scheduledAt?.toISOString(),
    })
  })).parse(bot)
}

/**
 * @see https://bun.sh/docs/api/sqlite
 */

class SqliteDb implements Db {

  private db: BunSqlLiteDb;

  private constructor() {
    // const db = new Database("mydb.sqlite");
    this.db = new BunSqlLiteDb("mydb.sqlite");
    this.init()
  }

  private init() {
    this.db.exec("PRAGMA journal_mode = WAL;");
    this.db.run(`
      CREATE TABLE IF NOT EXISTS bots (
        uid STRING PRIMARY KEY, 
        team_id STRING,
        token STRING,
        scope STRING,
        scheduled_at STRING
      )
    `)
  }

  public static connect() {
    return new SqliteDb();
  }

  public close() {
    this.db.close()
  }

  public addBot(data: Bot) {
    const botRecord = botToSqlite(data);

    this.db.query(`
      INSERT INTO bots (uid, team_id, token, scope)
      VALUES ($uid, $team_id, $token, $scope)
    `).run({
      $uid: botRecord.uid,
      $team_id: botRecord.team_id,
      $token: botRecord.token,
      $scope: botRecord.scope,
    });

    const result = this.db.query(`
      SELECT * from bots where rowId = last_insert_rowid()
    `).get()
    
    if (!result) throw new Error('Bot insertion failed');

    return sqliteToBot(result)
  }

  public getBot(teamId: string) {
    const result = this.db.query(`
      SELECT * FROM bots WHERE team_id = $teamId
    `).get({ $teamId: teamId })

    return result === null
      ? result
      : sqliteToBot(result)
  }

  public listBots() {
    const results = this.db.query(`
      SELECT * FROM bots
    `).all()

    return results.map(sqliteToBot)
  }

  public scheduleBot(teamId: string, scheduledAt: Date) {
    this.db.query(`
      UPDATE bots
      SET scheduled_at = $scheduled_at
      WHERE team_id = $team_id
    `).run({ 
      $team_id: teamId,
      // format?
      $scheduled_at: scheduledAt.toISOString()
    })
  }

  public deleteBot(teamId: string) {
    this.db.query(`
      DELETE FROM bots WHERE team_id = $team_id'
    `).get({ $team_id: teamId })
  }
}

export default SqliteDb
