CREATE TABLE `block_relations` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`user_id` text NOT NULL,
	`source_block_id` text NOT NULL,
	`target_block_id` text NOT NULL,
	`relation_type` text DEFAULT 'related_to' NOT NULL,
	`origin` text DEFAULT 'parser' NOT NULL,
	`confidence` real DEFAULT 1,
	`metadata_json` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `blk_rel_src_idx` ON `block_relations` (`source_block_id`);--> statement-breakpoint
CREATE INDEX `blk_rel_tgt_idx` ON `block_relations` (`target_block_id`);--> statement-breakpoint
CREATE INDEX `blk_rel_ws_user_idx` ON `block_relations` (`workspace_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `document_blocks` (
	`id` text PRIMARY KEY NOT NULL,
	`document_id` text NOT NULL,
	`workspace_id` text NOT NULL,
	`user_id` text NOT NULL,
	`document_version` integer DEFAULT 1 NOT NULL,
	`block_index` integer NOT NULL,
	`block_type` text NOT NULL,
	`content` text NOT NULL,
	`content_hash` text NOT NULL,
	`start_offset` integer NOT NULL,
	`end_offset` integer NOT NULL,
	`start_line` integer NOT NULL,
	`end_line` integer NOT NULL,
	`heading_anchor` text,
	`section_title` text,
	`metadata_json` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`document_id`) REFERENCES `notes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `doc_blocks_doc_idx` ON `document_blocks` (`document_id`,`block_index`);--> statement-breakpoint
CREATE INDEX `doc_blocks_ws_user_idx` ON `document_blocks` (`workspace_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `doc_blocks_hash_idx` ON `document_blocks` (`document_id`,`content_hash`);--> statement-breakpoint
CREATE TABLE `document_embeddings` (
	`id` text PRIMARY KEY NOT NULL,
	`document_id` text NOT NULL,
	`block_id` text NOT NULL,
	`workspace_id` text NOT NULL,
	`user_id` text NOT NULL,
	`content_hash` text NOT NULL,
	`text_hash` text NOT NULL,
	`embedding_model` text NOT NULL,
	`embedding_version` integer DEFAULT 1 NOT NULL,
	`dimensions` integer NOT NULL,
	`embedding` blob,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`document_id`) REFERENCES `notes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `doc_emb_doc_blk_idx` ON `document_embeddings` (`document_id`,`block_id`);--> statement-breakpoint
CREATE INDEX `doc_emb_ws_user_idx` ON `document_embeddings` (`workspace_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `doc_emb_hash_idx` ON `document_embeddings` (`content_hash`);--> statement-breakpoint
CREATE TABLE `document_index_state` (
	`document_id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`user_id` text NOT NULL,
	`content_version` integer DEFAULT 1 NOT NULL,
	`fts_version` integer DEFAULT 0 NOT NULL,
	`embedding_version` integer DEFAULT 0 NOT NULL,
	`relationship_version` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`last_indexed_at` integer,
	`error` text,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`document_id`) REFERENCES `notes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `document_links` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`user_id` text NOT NULL,
	`source_document_id` text NOT NULL,
	`target_document_id` text NOT NULL,
	`target_anchor` text,
	`link_type` text DEFAULT 'wiki' NOT NULL,
	`origin` text DEFAULT 'parser' NOT NULL,
	`confidence` real DEFAULT 1,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_document_id`) REFERENCES `notes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`target_document_id`) REFERENCES `notes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `doc_links_src_idx` ON `document_links` (`source_document_id`);--> statement-breakpoint
CREATE INDEX `doc_links_tgt_idx` ON `document_links` (`target_document_id`);--> statement-breakpoint
CREATE INDEX `doc_links_ws_user_idx` ON `document_links` (`workspace_id`,`user_id`);