CREATE TABLE `board_comments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cardId` int NOT NULL,
	`authorName` varchar(128) NOT NULL,
	`authorPersonId` varchar(64),
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `board_comments_id` PRIMARY KEY(`id`)
);
