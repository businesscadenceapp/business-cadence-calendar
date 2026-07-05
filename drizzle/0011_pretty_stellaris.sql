CREATE TABLE `kpi_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`accountId` int NOT NULL,
	`businessSlug` varchar(64) NOT NULL,
	`name` varchar(256) NOT NULL,
	`unit` varchar(32) NOT NULL DEFAULT '#',
	`frequency` enum('weekly','monthly') NOT NULL DEFAULT 'weekly',
	`sortOrder` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `kpi_categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `kpi_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`categoryId` int NOT NULL,
	`personId` varchar(64) NOT NULL,
	`accountId` int NOT NULL,
	`value` double NOT NULL,
	`periodKey` varchar(10) NOT NULL,
	`submittedAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `kpi_entries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `persons` (
	`id` varchar(64) NOT NULL,
	`accountId` int NOT NULL,
	`name` varchar(128) NOT NULL,
	`email` varchar(320) NOT NULL,
	`role` enum('owner','coowner','employee') NOT NULL DEFAULT 'employee',
	`businessScope` text NOT NULL DEFAULT ('[]'),
	`passwordHash` varchar(255),
	`inviteToken` varchar(128),
	`inviteAccepted` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `persons_id` PRIMARY KEY(`id`),
	CONSTRAINT `persons_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
ALTER TABLE `board_cards` MODIFY COLUMN `assignedTo` varchar(128);--> statement-breakpoint
ALTER TABLE `board_cards` MODIFY COLUMN `completedBy` varchar(128);--> statement-breakpoint
ALTER TABLE `board_cards` MODIFY COLUMN `confirmedBy` varchar(128);--> statement-breakpoint
ALTER TABLE `board_cards` MODIFY COLUMN `seenBy` varchar(128);--> statement-breakpoint
ALTER TABLE `board_cards` ADD `assignedToPersonId` varchar(64);--> statement-breakpoint
ALTER TABLE `board_cards` ADD `dueAt` bigint;