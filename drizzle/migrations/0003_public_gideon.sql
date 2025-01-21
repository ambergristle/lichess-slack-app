DROP INDEX `bot_id_idx`;--> statement-breakpoint
DROP INDEX `user_id_idx`;--> statement-breakpoint
CREATE UNIQUE INDEX `bot_user_idx` ON `scheduled-puzzle-jobs` (`bot_id`,`user_id`);