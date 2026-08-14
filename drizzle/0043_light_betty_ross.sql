CREATE TABLE `push_devices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`accountId` int NOT NULL,
	`personId` varchar(64) NOT NULL,
	`platform` enum('ios','android') NOT NULL,
	`token` varchar(512) NOT NULL,
	`lastSeenAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `push_devices_id` PRIMARY KEY(`id`),
	CONSTRAINT `push_devices_token_idx` UNIQUE(`token`),
	CONSTRAINT `push_devices_person_platform_token_idx` UNIQUE(`personId`,`platform`,`token`)
);
