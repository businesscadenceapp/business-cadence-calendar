CREATE TABLE `team_calendar_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`accountId` int NOT NULL,
	`showDaily` boolean NOT NULL DEFAULT true,
	`showWeekly` boolean NOT NULL DEFAULT true,
	`showMonthly` boolean NOT NULL DEFAULT true,
	`showQuarterly` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `team_calendar_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `team_calendar_settings_accountId_unique` UNIQUE(`accountId`)
);
