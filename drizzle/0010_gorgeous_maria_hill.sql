CREATE TABLE `goals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`accountId` int NOT NULL,
	`business` enum('chiropractic','crossfit','realty','general') NOT NULL DEFAULT 'general',
	`period` enum('annual','quarterly') NOT NULL DEFAULT 'quarterly',
	`quarter` int,
	`year` int NOT NULL,
	`title` varchar(256) NOT NULL,
	`description` text,
	`status` enum('active','achieved','missed','deferred') NOT NULL DEFAULT 'active',
	`owner` enum('Matt','Lynn','both') NOT NULL DEFAULT 'both',
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `goals_id` PRIMARY KEY(`id`)
);
