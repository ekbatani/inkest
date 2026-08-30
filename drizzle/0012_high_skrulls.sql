CREATE TABLE `credit_ledger` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`workspace_id` text NOT NULL,
	`delta` real NOT NULL,
	`reason` text NOT NULL,
	`payment_id` text,
	`note` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`payment_id`) REFERENCES `payments`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `credit_ledger_payment_reason_uq` ON `credit_ledger` (`payment_id`,`reason`);--> statement-breakpoint
CREATE INDEX `credit_ledger_user_idx` ON `credit_ledger` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`workspace_id` text NOT NULL,
	`provider` text NOT NULL,
	`provider_invoice_id` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`amount_usd` real NOT NULL,
	`credits` real NOT NULL,
	`paid_amount` real,
	`paid_asset` text,
	`paid_network` text,
	`wallet_address` text,
	`tx_hash` text,
	`metadata_json` text,
	`confirmed_at` integer,
	`expires_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payments_provider_invoice_uq` ON `payments` (`provider_invoice_id`);--> statement-breakpoint
CREATE INDEX `payments_user_idx` ON `payments` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `payments_status_idx` ON `payments` (`status`,`created_at`);