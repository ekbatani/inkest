CREATE TABLE `google_calendar_connections` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`workspace_id` text NOT NULL,
	`google_email` text,
	`calendar_id` text DEFAULT 'primary' NOT NULL,
	`access_token` text NOT NULL,
	`refresh_token` text,
	`token_type` text,
	`scope` text,
	`access_token_expires_at` integer,
	`last_synced_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `google_calendar_connections_user_id_unique` ON `google_calendar_connections` (`user_id`);--> statement-breakpoint
CREATE TABLE `google_calendar_events` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`workspace_id` text NOT NULL,
	`connection_id` text,
	`external_key` text NOT NULL,
	`google_event_id` text NOT NULL,
	`calendar_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`location` text,
	`html_link` text,
	`status` text,
	`starts_at` integer NOT NULL,
	`ends_at` integer NOT NULL,
	`all_day` integer DEFAULT false NOT NULL,
	`source_updated_at` text,
	`synced_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`connection_id`) REFERENCES `google_calendar_connections`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `google_calendar_events_external_key_unique` ON `google_calendar_events` (`external_key`);--> statement-breakpoint
ALTER TABLE `tasks` ADD `due_reminder_sent_at` integer;--> statement-breakpoint
ALTER TABLE `users` ADD `telegram_chat_id` text;--> statement-breakpoint
ALTER TABLE `users` ADD `telegram_link_code` text;--> statement-breakpoint
ALTER TABLE `users` ADD `telegram_link_code_expires_at` integer;--> statement-breakpoint
CREATE UNIQUE INDEX `users_telegram_chat_id_unique` ON `users` (`telegram_chat_id`);