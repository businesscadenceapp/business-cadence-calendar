ALTER TABLE `board_cards` ADD `meetingType` enum('daily_huddle','weekly_meeting','quarterly_review');--> statement-breakpoint
ALTER TABLE `board_cards` ADD `scheduledDate` bigint;--> statement-breakpoint
ALTER TABLE `board_cards` ADD `updateDate` bigint;