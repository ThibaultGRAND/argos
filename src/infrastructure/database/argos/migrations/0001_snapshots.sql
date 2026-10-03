CREATE TABLE `snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`project_path` text NOT NULL,
	`provider_id` text NOT NULL,
	`session_external_id` text NOT NULL,
	`ordinal` integer NOT NULL,
	`kind` text NOT NULL,
	`commit_hash` text NOT NULL,
	`parent_commit_hash` text,
	`files_changed` integer NOT NULL,
	`lines_added` integer NOT NULL,
	`lines_removed` integer NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `snapshots_session_idx` ON `snapshots` (`provider_id`,`session_external_id`,`ordinal`);