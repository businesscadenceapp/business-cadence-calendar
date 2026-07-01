CREATE TABLE `business_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`accountId` int NOT NULL,
	`businessName` varchar(256) NOT NULL,
	`industry` varchar(64) NOT NULL,
	`ownerCount` int NOT NULL DEFAULT 1,
	`employeeCount` int NOT NULL DEFAULT 0,
	`workDays` text NOT NULL,
	`meetingDayPrefs` text NOT NULL,
	`onboardingComplete` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `business_profiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `closed_periods` (
	`id` int AUTO_INCREMENT NOT NULL,
	`accountId` int NOT NULL,
	`startDate` varchar(10) NOT NULL,
	`endDate` varchar(10) NOT NULL,
	`label` varchar(128),
	`periodType` enum('day','week') NOT NULL DEFAULT 'day',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `closed_periods_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `meeting_schedule_overrides` (
	`id` int AUTO_INCREMENT NOT NULL,
	`accountId` int NOT NULL,
	`originalDate` varchar(10) NOT NULL,
	`meetingType` enum('daily','weekly','monthly','quarterly') NOT NULL,
	`rescheduledDate` varchar(10) NOT NULL,
	`reason` varchar(256),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `meeting_schedule_overrides_id` PRIMARY KEY(`id`)
);
