CREATE TABLE `announcements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`accountId` int NOT NULL,
	`fromPersonId` varchar(64) NOT NULL,
	`toPersonId` varchar(64),
	`body` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `announcements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `owner_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`accountId` int NOT NULL,
	`fromPersonId` varchar(64) NOT NULL,
	`toPersonId` varchar(64) NOT NULL,
	`body` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `owner_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `board_cards` ADD `priority` enum('high','medium','low') DEFAULT 'medium';