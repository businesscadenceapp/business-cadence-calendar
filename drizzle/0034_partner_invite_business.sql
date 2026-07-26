ALTER TABLE `notifications` MODIFY COLUMN `type` enum('task_assigned','task_done_pending','task_confirmed','new_update','new_issue','overdue_task','partner_joined') NOT NULL;--> statement-breakpoint
ALTER TABLE `persons` ADD `partnerInviteBusinessName` varchar(256);
