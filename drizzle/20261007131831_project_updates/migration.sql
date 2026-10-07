ALTER TABLE `projects` ADD `update_started_at` integer;--> statement-breakpoint
ALTER TABLE `projects` ADD `update_description` text DEFAULT '' NOT NULL;