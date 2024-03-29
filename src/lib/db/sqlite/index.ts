import { Database as BunSqlLiteDb } from 'bun:sqlite';

import { PersistenceError } from '@/lib/errors';
import type { Bot, Schedule } from '@/types';
import Db from '../abstract';
import { botToSqlite, sqliteToBot } from './adapters';

/**
 * @see https://bun.sh/docs/api/sqlite
 */

class SqliteDb implements Db {

  private db: BunSqlLiteDb;

  private constructor() {
    // const db = new Database("mydb.sqlite");
    this.db = new BunSqlLiteDb('mydb.sqlite');
    this.init();
  }

  private init() {
    this.db.exec('PRAGMA journal_mode = WAL;');
    this.db.run(`
      CREATE TABLE IF NOT EXISTS bots (
        uid STRING PRIMARY KEY, 
        team_id STRING,
        channel_id STRING,
        token STRING,
        scope STRING,
        webhook_url STRING,
        schedule_id STRING,
        cron STRING
      )
    `);
  }

  public static connect() {
    return new SqliteDb();
  }

  public close() {
    this.db.close();
  }

  public addBot(data: Bot) {
    const botRecord = botToSqlite(data);

    this.db.query(`
      INSERT INTO bots (uid, team_id, channel_id, token, scope, webhook_url)
      VALUES ($uid, $team_id, $channel_id, $token, $scope, $webhook_url)
    `).run({
      $uid: botRecord.uid,
      $team_id: botRecord.team_id,
      $channel_id: botRecord.channel_id,
      $token: botRecord.token,
      $scope: botRecord.scope,
      $webhook_url: botRecord.webhook_url,
    });

    const result = this.db.query(`
      SELECT * from bots where rowId = last_insert_rowid()
    `).get();
    
    if (!result) throw new PersistenceError('Bot insertion failed', {
      code: 'unknown',
      collection: 'bots',
      op: 'write',
    });

    return sqliteToBot(result);
  }

  public getBot(teamId: string) {
    const result = this.db.query(`
      SELECT * FROM bots WHERE team_id = $teamId
    `).get({ $teamId: teamId });

    return result === null
      ? result
      : sqliteToBot(result);
  }

  public listBots() {
    const results = this.db.query(`
      SELECT * FROM bots
    `).all();

    return results.map(sqliteToBot);
  }

  public scheduleBot(teamId: string, schedule: Schedule) {
    this.db.query(`
      UPDATE bots
      SET schedule_id = $schedule_id, cron = $cron
      WHERE team_id = $team_id
    `).run({ 
      $team_id: teamId,
      $schedule_id: schedule.scheduleId,
      $cron: schedule.cron,
    });
  }

  public deleteBot(teamId: string) {
    this.db.query(`
      DELETE FROM bots WHERE team_id = $team_id'
    `).get({ $team_id: teamId });
  }
}

export default SqliteDb;
