CREATE TABLE IF NOT EXISTS `missions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL REFERENCES `user`(`id`),
	`type` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`target_value` integer DEFAULT 1 NOT NULL,
	`current_value` integer DEFAULT 0 NOT NULL,
	`muscle_group` text,
	`status` text DEFAULT 'active' NOT NULL,
	`xp_reward` integer DEFAULT 100 NOT NULL,
	`expires_at` integer,
	`completed_at` integer,
	`created_at` integer
);
