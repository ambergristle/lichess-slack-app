import { eq } from 'drizzle-orm';

import type { DB } from '@/lib/db';
import { Bot, BotChannel } from '@/lib/db/schema';
import { generateRowId } from '@/lib/db/utils';
import { decrypt, encrypt } from '@/lib/utils/encryption';
import { Oops, PersistenceError } from '@/lib/utils/errors';


/** Bearer */
export const getBotChannelToken = async (
  db: DB,
  channelId: string,
): Promise<{
  botId: string;
  accessToken: string;
}> => {
  const [bot] = await db
    .select({
      id: Bot.id,
      accessToken: Bot.accessToken,
    })
    .from(Bot)
    .where(eq(BotChannel.channelId, channelId))
    .innerJoin(BotChannel, eq(Bot.id, BotChannel.botId))
    .limit(1);

  if (!bot) {
    throw new PersistenceError('Invalid Bot identifier', {
      identifier: { channelId },
    });
  }

  let accessToken: string;
  try {
    const decrypted = decrypt(Uint8Array.from(bot.accessToken));
    accessToken = new TextDecoder().decode(decrypted)
  } catch (cause) {
    throw Oops.fromError('Invalid access token', cause);
  }

  return {
    botId: bot.id,
    accessToken,
  }
}

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
  try {
    let botData: {
      scope: string;
      accessToken: Buffer;
      updatedAt: number;
    };
    try {
      const encoded = new TextEncoder().encode(accessToken);
      botData = {
        scope,
        accessToken: encrypt(encoded),
        updatedAt: Date.now(),
      };
    } catch (cause) {
      throw Oops.fromError('Failed to encrypt access token', cause);
    }

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
        throw new PersistenceError('Failed to insert Bot');
      }

      await tx.insert(BotChannel).values({
        botId: bot.id,
        channelId,
        webhookUrl,
        createdAt: botData.updatedAt,
        updatedAt: botData.updatedAt,
      });
    });
  } catch (cause) {
    throw Oops.fromError('Failed to upsert Bot records', cause);
  }
};
