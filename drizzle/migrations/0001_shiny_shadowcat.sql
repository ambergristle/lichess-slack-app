CREATE TABLE `scheduled-puzzle-jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`bot_id` text NOT NULL,
	`user_id` text NOT NULL,
	`job_id` text NOT NULL,
	`cron` text NOT NULL,
	`time_zone` text NOT NULL,
	FOREIGN KEY (`bot_id`) REFERENCES `bots`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_bots` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`app_id` text NOT NULL,
	`channel_id` text NOT NULL,
	`scope` text NOT NULL,
	`access_token` blob NOT NULL,
	`webhook_url` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_bots`("id", "created_at", "updated_at", "app_id", "channel_id", "scope", "access_token", "webhook_url") SELECT "id", "created_at", "updated_at", "app_id", "channel_id", "scope", "access_token", "webhook_url" FROM `bots`;--> statement-breakpoint
DROP TABLE `bots`;--> statement-breakpoint
ALTER TABLE `__new_bots` RENAME TO `bots`;--> statement-breakpoint
PRAGMA foreign_keys=ON;