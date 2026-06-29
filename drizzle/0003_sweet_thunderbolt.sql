CREATE TABLE `agenda_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`business` enum('chiropractic','crossfit','realty') NOT NULL,
	`meetingType` enum('daily','weekly','monthly','quarterly') NOT NULL,
	`itemsJson` text NOT NULL,
	`updatedBy` enum('Matt','Lynn') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agenda_templates_id` PRIMARY KEY(`id`)
);
