CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`accountId` int NOT NULL,
	`recipientPersonId` varchar(64) NOT NULL,
	`type` enum('task_assigned','task_done_pending','task_confirmed','new_update','new_issue','overdue_task') NOT NULL,
	`title` varchar(256) NOT NULL,
	`body` varchar(512) NOT NULL,
	`linkTo` varchar(256) NOT NULL DEFAULT '/app/board',
	`isRead` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
