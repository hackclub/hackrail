CREATE TABLE `payouts` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`project_id` integer NOT NULL UNIQUE,
	`recipient_slack_id` text NOT NULL,
	`admin_slack_id` text NOT NULL,
	`tier` integer NOT NULL,
	`hours` real NOT NULL,
	`rate` integer NOT NULL,
	`amount` integer NOT NULL,
	`created_at` integer NOT NULL,
	CONSTRAINT `fk_payouts_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_payouts_recipient_slack_id_users_slack_id_fk` FOREIGN KEY (`recipient_slack_id`) REFERENCES `users`(`slack_id`) ON DELETE CASCADE
);
