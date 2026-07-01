ALTER TABLE `board_cards` MODIFY COLUMN `type` enum('update','issue','task') NOT NULL;--> statement-breakpoint
ALTER TABLE `board_cards` ADD `assignedTo` enum('Matt','Lynn');--> statement-breakpoint
ALTER TABLE `board_cards` ADD `completedAt` timestamp;--> statement-breakpoint
ALTER TABLE `board_cards` ADD `completedBy` enum('Matt','Lynn');--> statement-breakpoint
ALTER TABLE `board_cards` ADD `confirmedAt` timestamp;--> statement-breakpoint
ALTER TABLE `board_cards` ADD `confirmedBy` enum('Matt','Lynn');