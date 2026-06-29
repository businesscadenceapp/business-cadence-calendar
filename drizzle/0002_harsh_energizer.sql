CREATE TABLE `board_cards` (
	`id` int AUTO_INCREMENT NOT NULL,
	`author` enum('Matt','Lynn') NOT NULL,
	`type` enum('update','issue') NOT NULL,
	`business` enum('chiropractic','crossfit','realty','general') NOT NULL DEFAULT 'general',
	`content` text NOT NULL,
	`seenAt` timestamp,
	`seenBy` enum('Matt','Lynn'),
	`archivedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `board_cards_id` PRIMARY KEY(`id`)
);
