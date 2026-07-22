ALTER TABLE `agenda_templates` MODIFY COLUMN `business` enum('chiropractic','crossfit') NOT NULL;--> statement-breakpoint
ALTER TABLE `board_cards` MODIFY COLUMN `business` enum('chiropractic','crossfit','general') NOT NULL DEFAULT 'general';--> statement-breakpoint
ALTER TABLE `goals` MODIFY COLUMN `business` enum('chiropractic','crossfit','general') NOT NULL DEFAULT 'general';