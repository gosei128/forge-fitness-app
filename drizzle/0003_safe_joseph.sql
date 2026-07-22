CREATE TABLE IF NOT EXISTS `template_exercises` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`template_id` integer NOT NULL,
	`exercise_id` integer NOT NULL,
	`order_number` integer NOT NULL,
	FOREIGN KEY (`template_id`) REFERENCES `workout_templates`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `workout_templates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`name` text NOT NULL,
	`rest_time` integer DEFAULT 60 NOT NULL,
	`weight_unit` text DEFAULT 'lbs' NOT NULL,
	`created_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `personal_records` ADD `weight_unit` text DEFAULT 'lbs' NOT NULL;--> statement-breakpoint
ALTER TABLE `sets` ADD `weight_unit` text DEFAULT 'lbs' NOT NULL;--> statement-breakpoint
ALTER TABLE `workout_sessions` ADD `rest_time` integer DEFAULT 60 NOT NULL;