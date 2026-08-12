CREATE TABLE `meeting_attendance` (
  `id` int AUTO_INCREMENT NOT NULL,
  `accountId` int NOT NULL,
  `dateKey` varchar(10) NOT NULL,
  `meetingType` enum('daily','weekly','monthly','quarterly') NOT NULL,
  `status` enum('held','rescheduled','not_held') NOT NULL,
  `rescheduledDate` varchar(10),
  `updatedByPersonId` varchar(64),
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `meeting_attendance_account_date_type_idx` UNIQUE(`accountId`,`dateKey`,`meetingType`)
);
