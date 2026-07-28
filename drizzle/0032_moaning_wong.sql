CREATE TABLE `partner_links` (
	`id` int AUTO_INCREMENT NOT NULL,
	`accountId` int NOT NULL,
	`ownerPersonId` varchar(64) NOT NULL,
	`partnerPersonId` varchar(64) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `partner_links_id` PRIMARY KEY(`id`),
	CONSTRAINT `partner_links_partnerPersonId_unique` UNIQUE(`partnerPersonId`)
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`accountId` int NOT NULL,
	`ownerPersonId` varchar(64) NOT NULL,
	`revenueCatUserId` varchar(256),
	`revenueCatProductId` varchar(256),
	`plan` enum('core','core_team') NOT NULL DEFAULT 'core',
	`status` enum('trialing','active','lapsed','cancelled') NOT NULL DEFAULT 'trialing',
	`trialEndsAt` timestamp,
	`currentPeriodEndsAt` timestamp,
	`revenueCatData` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subscriptions_id` PRIMARY KEY(`id`),
	CONSTRAINT `subscriptions_accountId_unique` UNIQUE(`accountId`)
);
