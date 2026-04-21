import { eq } from 'drizzle-orm';

import { DB } from '@/lib/db';
import { Bot, BotChannel } from '@/lib/db/schema';
import { generateRowId } from '@/lib/db/utils';
import { decryptToString, encryptString } from '@/lib/utils/encryption';
import { KnownError } from '@/lib/utils/errors';


/** Bearer */
export const getBotAccessToken = async (
  db: DB,
  identifier: BotIdentifier
) => {
  const isBotId = (identifier: BotIdentifier): identifier is { botId: string } => {
    const botId = (identifier as { botId: string }).botId;
    return !!botId && typeof botId === 'string';
  };

  let bot: { id: string; accessToken: Buffer; } | undefined = undefined;
  if (isBotId(identifier)) {
    [bot] = await db
      .select({
        id: Bot.id,
        accessToken: Bot.accessToken,
      })
      .from(Bot)
      .where(eq(Bot.id, identifier.botId))
      .limit(1);
  } else {
    [bot] = await db
      .select({
        id: Bot.id,
        accessToken: Bot.accessToken,
      })
      .from(Bot)
      .leftJoin(BotChannel, eq(Bot.id, BotChannel.botId))
      .where(eq(BotChannel.channelId, identifier.channelId))
      .limit(1);
  }

  if (!bot) {
    throw new KnownError('Invalid Bot identifier', {
      cause: identifier,
    });
  }

  return {
    botId: bot.id,
    accessToken: decryptToString(bot.accessToken),
  };
};

type BotIdentifier = { botId: string } | { channelId: string }


/**
 * Register Slack Bot
 */
export const registerBot = async (
  db: DB,
  {
    botUserId,
    channelId,
    scope,
    webhookUrl,
    accessToken,
  }: {
    botUserId: string;
    channelId: string;
    scope: string;
    webhookUrl: string;
    accessToken: string;
  }
) => {

  const botData = {
    scope,
    accessToken: Buffer.from(encryptString(accessToken)),
    updatedAt: new Date(),
  };

  await db.transaction(async (tx) => {
    const [bot] = await tx
      .insert(Bot)
      .values({
        id: generateRowId(botUserId),
        botUserId,
        ...botData,
        createdAt: botData.updatedAt,
      })
      .onConflictDoUpdate({
        target: [Bot.botUserId],
        set: botData,
      })
      .returning({
        id: Bot.id,
      });

    if (!bot) {
      throw new KnownError('Failed to insert bot');
    }

    await tx
      .insert(BotChannel)
      .values({
        botId: bot.id,
        channelId,
        webhookUrl,
        createdAt: botData.updatedAt,
        updatedAt: botData.updatedAt,
      });
  });
};
