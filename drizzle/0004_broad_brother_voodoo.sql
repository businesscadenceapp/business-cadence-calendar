CREATE TABLE `waitlist_emails` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`source` varchar(64) NOT NULL DEFAULT 'homepage',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `waitlist_emails_id` PRIMARY KEY(`id`),
	CONSTRAINT `waitlist_emails_email_unique` UNIQUE(`email`)
);
