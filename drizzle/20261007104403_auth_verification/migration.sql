ALTER TABLE `users` ADD `verification_status` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `ysws_eligible` integer DEFAULT false NOT NULL;