CREATE TABLE `meeting_recordings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`meetingLogId` int NOT NULL,
	`audioKey` varchar(512),
	`transcript` text,
	`aiNotes` text,
	`processingStatus` enum('pending','processing','done','error') NOT NULL DEFAULT 'pending',
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `meeting_recordings_id` PRIMARY KEY(`id`)
);
