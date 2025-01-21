CREATE TABLE `bots` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`app_id` text NOT NULL,
	`channel_id` text NOT NULL,
	`scope` text NOT NULL,
	`access_token` blob NOT NULL,
	`webhook_url` text NOT NULL,
	`job_id` text,
	`cron` text,
	`time_zone` text,
	CONSTRAINT "schedule-id" CHECK("bots"."job_id" IS NULL OR ("bots"."cron" IS NOT NULL AND "bots"."time_zone" IS NOT NULL))
);
