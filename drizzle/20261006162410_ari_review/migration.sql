CREATE TABLE `ari_deliveries` (
	`delivery_id` text PRIMARY KEY,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `projects` ADD `ari_submission_id` text DEFAULT '' NOT NULL;