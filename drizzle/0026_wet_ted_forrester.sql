CREATE TABLE `business_hours` (
	`id` int AUTO_INCREMENT NOT NULL,
	`accountId` int NOT NULL,
	`workDays` text NOT NULL,
	`startTime` varchar(5) NOT NULL DEFAULT '08:00',
	`endTime` varchar(5) NOT NULL DEFAULT '18:00',
	`timezone` varchar(64) NOT NULL DEFAULT 'America/New_York',
	`manualDndActive` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `business_hours_id` PRIMARY KEY(`id`),
	CONSTRAINT `business_hours_accountId_unique` UNIQUE(`accountId`)
);
