import { Bot } from "../../schemas";

abstract class Db {
  abstract createBot(data: Bot): Bot | Promise<Bot>;

  abstract findBotByTeamId(teamId: string): Bot | Promise<Bot>;

  abstract scheduleBotByTeamId(teamId: string, scheduledAt: Date): Bot | Promise<Bot>;

  abstract deleteBotByTeamId(teamId: string): Bot | Promise<Bot>;
}

export default Db;