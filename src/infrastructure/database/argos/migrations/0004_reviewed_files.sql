CREATE TABLE `reviewed_files` (
	`id` text PRIMARY KEY NOT NULL,
	`provider_id` text NOT NULL,
	`session_external_id` text NOT NULL,
	`file_path` text NOT NULL,
	`blob` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reviewed_files_session_path_unique` ON `reviewed_files` (`provider_id`,`session_external_id`,`file_path`);