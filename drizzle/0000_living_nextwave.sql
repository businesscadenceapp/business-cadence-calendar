CREATE TABLE `agenda_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`meetingLogId` int NOT NULL,
	`itemKey` varchar(128) NOT NULL,
	`completed` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agenda_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `meeting_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dateKey` varchar(10) NOT NULL,
	`meetingType` enum('daily','weekly','monthly','quarterly') NOT NULL,
	`notes` text,
	`aiSummary` text,
	`summaryGeneratedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `meeting_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
