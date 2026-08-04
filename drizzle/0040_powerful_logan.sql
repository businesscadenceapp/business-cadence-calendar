ALTER TABLE `subscriptions` MODIFY COLUMN `plan` enum('core','core_team','founding','co_owner','co_owner_team') NOT NULL DEFAULT 'co_owner';--> statement-breakpoint
ALTER TABLE `subscriptions` MODIFY COLUMN `status` enum('trialing','active','lapsed','cancelled','beta') NOT NULL DEFAULT 'trialing';--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `betaGrantedBy` varchar(64);--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `betaNote` varchar(256);