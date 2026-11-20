CREATE TABLE `child_profiles` (
	`owner_id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`height` real,
	`weight` real,
	`measured_at` text,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `comparisons` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`kind` text NOT NULL,
	`entry_key` text NOT NULL,
	`payload` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `comparisons_owner_idx` ON `comparisons` (`owner_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `comparisons_owner_key_idx` ON `comparisons` (`owner_id`,`kind`,`entry_key`);--> statement-breakpoint
CREATE TABLE `outfits` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`reference_key` text NOT NULL,
	`payload` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `outfits_owner_idx` ON `outfits` (`owner_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `outfits_owner_reference_idx` ON `outfits` (`owner_id`,`reference_key`);