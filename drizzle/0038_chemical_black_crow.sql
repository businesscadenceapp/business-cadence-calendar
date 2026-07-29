CREATE TABLE `meeting_notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`accountId` int NOT NULL,
	`personId` varchar(64) NOT NULL,
	`meetingType` enum('daily','weekly','monthly','quarterly') NOT NULL DEFAULT 'weekly',
	`title` varchar(256) NOT NULL,
	`transcript` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `meeting_notes_id` PRIMARY KEY(`id`)
);
