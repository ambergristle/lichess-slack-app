DROP INDEX `bot_user_idx`;--> statement-breakpoint
CREATE UNIQUE INDEX `appIdUniqueIndex` ON `bots` (`app_id`);