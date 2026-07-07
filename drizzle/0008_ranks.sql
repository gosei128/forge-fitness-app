CREATE TABLE `ranks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`min_xp` integer DEFAULT 0 NOT NULL,
	`max_xp` integer DEFAULT 0 NOT NULL,
	`level` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
ALTER TABLE `user_stats` ADD `current_rank` text DEFAULT 'Newbie' NOT NULL;
