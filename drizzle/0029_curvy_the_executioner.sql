ALTER TABLE `persons` ADD `passwordResetToken` varchar(128);--> statement-breakpoint
ALTER TABLE `persons` ADD `passwordResetExpiry` timestamp;