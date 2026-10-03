CREATE TABLE `review_comments` (
	`id` text PRIMARY KEY NOT NULL,
	`provider_id` text NOT NULL,
	`session_external_id` text NOT NULL,
	`snapshot_id` text NOT NULL,
	`file_path` text NOT NULL,
	`line` integer NOT NULL,
	`side` text NOT NULL,
	`excerpt` text NOT NULL,
	`body` text NOT NULL,
	`sent_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`snapshot_id`) REFERENCES `snapshots`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `review_comments_session_idx` ON `review_comments` (`provider_id`,`session_external_id`);