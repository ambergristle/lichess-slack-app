ALTER TABLE `scheduled-puzzle-jobs` RENAME COLUMN "updated_aaaat" TO "updated_at";--> statement-breakpoint
ALTER TABLE `scheduled-puzzle-jobs` DROP COLUMN `user_id`;--> statement-breakpoint
DROP INDEX `appIdUniqueIndex`;--> statement-breakpoint
ALTER TABLE `bots` DROP COLUMN `app_id`;--> statement-breakpoint
ALTER TABLE `bots` DROP COLUMN `channel_id`;