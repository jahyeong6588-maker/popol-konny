CREATE TABLE `account_settings` (
	`owner_id` text PRIMARY KEY NOT NULL,
	`active_child_id` text
);
--> statement-breakpoint
CREATE TABLE `children` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`name` text NOT NULL,
	`height` real,
	`weight` real,
	`measured_at` text,
	`gender` text,
	`avatar_data_url` text,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `children_owner_idx` ON `children` (`owner_id`);--> statement-breakpoint
DROP INDEX `comparisons_owner_key_idx`;--> statement-breakpoint
ALTER TABLE `comparisons` ADD `child_id` text;--> statement-breakpoint
CREATE UNIQUE INDEX `comparisons_owner_key_idx` ON `comparisons` (`owner_id`,`child_id`,`kind`,`entry_key`);--> statement-breakpoint
DROP INDEX `outfits_owner_reference_idx`;--> statement-breakpoint
ALTER TABLE `outfits` ADD `child_id` text;--> statement-breakpoint
CREATE UNIQUE INDEX `outfits_owner_reference_idx` ON `outfits` (`owner_id`,`child_id`,`reference_key`);