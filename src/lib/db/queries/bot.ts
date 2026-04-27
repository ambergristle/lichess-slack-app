import { eq } from 'drizzle-orm';

import type { DB } from '@/lib/db';
import { Bot, BotChannel } from '@/lib/db/schema';
import { generateRowId } from '@/lib/db/utils';
import { decrypt, encrypt } from '@/lib/utils/encryption';
import { Oops, PersistenceError } from '@/lib/utils/errors';

/** Bearer */
export const getBotAccessToken = async (db: DB, identifier: BotIdentifier) => {
  try {
    const isBotId = (
      identifier: BotIdentifier
    ): identifier is { botId: string } => {
      const botId = (identifier as { botId: string }).botId;
      return !!botId && typeof botId === 'string';
    };

    let bot: {
      id: string;
      accessToken: Buffer;
      locale?: string | null;
      checkedAt: number;
    } | undefined = undefined;

    if (isBotId(identifier)) {
      [bot] = await db
        .select({
          id: Bot.id,
          accessToken: Bot.accessToken,
          locale: BotChannel.locale,
          checkedAt: BotChannel.checkedAt,
        })
        .from(Bot)
        .where(eq(Bot.id, identifier.botId))
        .innerJoin(BotChannel, eq(Bot.id, BotChannel.botId))
        .limit(1);
    } else {
      [bot] = await db
        .select({
          id: Bot.id,
          accessToken: Bot.accessToken,
          locale: BotChannel.locale,
          checkedAt: BotChannel.checkedAt,
        })
        .from(Bot)
        .where(eq(BotChannel.channelId, identifier.channelId))
        .innerJoin(BotChannel, eq(Bot.id, BotChannel.botId))
        .limit(1);
    }

    if (!bot) {
      throw new PersistenceError('Invalid Bot identifier', {
        identifier,
      });
    }

    let decrypted: Uint8Array;
    try {
      decrypted = decrypt(Uint8Array.from(bot.accessToken));
    } catch (cause) {
      throw Oops.fromError('Failed to decrypt access token', cause);
    }

    return {
      botId: bot.id,
      accessToken: new TextDecoder().decode(decrypted),
      ...(bot.locale && {
        locale: bot.locale,
      }),
      checkedAt: bot.checkedAt,
    };
  } catch (cause) {
    throw Oops.fromError('Failed to get Bot access token', cause);
  }
};

type BotIdentifier = { botId: string } | { channelId: string };

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
