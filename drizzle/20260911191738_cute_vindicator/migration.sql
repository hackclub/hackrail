CREATE TABLE `orders` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`slack_id` text NOT NULL,
	`item_id` text NOT NULL,
	`quantity` real NOT NULL,
	`total_price` real NOT NULL,
	`created_at` integer NOT NULL,
	CONSTRAINT `fk_orders_slack_id_users_slack_id_fk` FOREIGN KEY (`slack_id`) REFERENCES `users`(`slack_id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`author_slack_id` text NOT NULL,
	`project_name` text NOT NULL,
	`image` text DEFAULT 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Den_Haag_Hollands_Spoor.jpg/3840px-Den_Haag_Hollands_Spoor.jpg',
	`project_code_url` text NOT NULL,
	`project_playable_url` text DEFAULT '' NOT NULL,
	`project_description` text NOT NULL,
	`hackatime_projects` text NOT NULL,
	`shipped` integer DEFAULT false NOT NULL,
	`rejected` integer DEFAULT false NOT NULL,
	`approved` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`override_hours_spent` integer DEFAULT 0 NOT NULL,
	`override_hours_spent_reason` text DEFAULT '' NOT NULL,
	CONSTRAINT `fk_projects_author_slack_id_users_slack_id_fk` FOREIGN KEY (`author_slack_id`) REFERENCES `users`(`slack_id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `review_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`project_id` integer NOT NULL,
	`reviewer_slack_id` text,
	`status` text NOT NULL,
	`status_message` text DEFAULT '' NOT NULL,
	`json_data` text DEFAULT '{}' NOT NULL,
	`created_at` integer NOT NULL,
	CONSTRAINT `fk_review_events_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`project_id` integer NOT NULL,
	`done` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	CONSTRAINT `fk_reviews_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `tokens` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`slack_id` text NOT NULL,
	`token` text NOT NULL,
	`created_at` integer NOT NULL,
	CONSTRAINT `fk_tokens_slack_id_users_slack_id_fk` FOREIGN KEY (`slack_id`) REFERENCES `users`(`slack_id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `users` (
	`slack_id` text PRIMARY KEY,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`email` text NOT NULL UNIQUE,
	`address_line_1` text NOT NULL,
	`address_line_2` text NOT NULL,
	`city` text NOT NULL,
	`state` text NOT NULL,
	`zip_code` text NOT NULL,
	`country` text NOT NULL,
	`birthdate` text NOT NULL,
	`balance` integer DEFAULT 0 NOT NULL,
	`is_hackatime_linked` integer DEFAULT false NOT NULL,
	`banned` integer DEFAULT false NOT NULL,
	`hackatime_token` text DEFAULT '' NOT NULL,
	`avatar` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL
);
