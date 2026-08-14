import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, json, double, bigint, uniqueIndex } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Stores a meeting log entry for a specific calendar day + meeting type.
 * One row per (dateKey, meetingType) pair.
 * dateKey format: "YYYY-MM-DD"
 */
export const meetingLogs = mysqlTable("meeting_logs", {
  id: int("id").autoincrement().primaryKey(),
  dateKey: varchar("dateKey", { length: 10 }).notNull(),
  meetingType: mysqlEnum("meetingType", ["daily", "weekly", "monthly", "quarterly"]).notNull(),
  notes: text("notes"),
  aiSummary: text("aiSummary"),
  summaryGeneratedAt: timestamp("summaryGeneratedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MeetingLog = typeof meetingLogs.$inferSelect;
export type InsertMeetingLog = typeof meetingLogs.$inferInsert;

/**
 * Account-scoped attendance status for each scheduled owner meeting. This keeps
 * the accountability signal separate from meeting notes, which can be saved
 * later or remain intentionally blank after a meeting is held.
 */
export const meetingAttendance = mysqlTable("meeting_attendance", {
  id: int("id").autoincrement().primaryKey(),
  accountId: int("accountId").notNull(),
  dateKey: varchar("dateKey", { length: 10 }).notNull(),
  meetingType: mysqlEnum("meetingType", ["daily", "weekly", "monthly", "quarterly"]).notNull(),
  status: mysqlEnum("status", ["held", "rescheduled", "not_held"]).notNull(),
  rescheduledDate: varchar("rescheduledDate", { length: 10 }),
  updatedByPersonId: varchar("updatedByPersonId", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  uniqueIndex("meeting_attendance_account_date_type_idx").on(table.accountId, table.dateKey, table.meetingType),
]);

export type MeetingAttendance = typeof meetingAttendance.$inferSelect;
export type InsertMeetingAttendance = typeof meetingAttendance.$inferInsert;

/**
 * Tracks individual agenda item completion for a meeting log.
 * itemKey is a stable string identifier for each agenda item.
 */
export const agendaItems = mysqlTable("agenda_items", {
  id: int("id").autoincrement().primaryKey(),
  meetingLogId: int("meetingLogId").notNull(),
  itemKey: varchar("itemKey", { length: 128 }).notNull(),
  completed: boolean("completed").default(false).notNull(),
  comment: text("comment"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AgendaItem = typeof agendaItems.$inferSelect;
export type InsertAgendaItem = typeof agendaItems.$inferInsert;

/**
 * Owner Board cards — shared updates and issues between co-owners.
 * type: "update" = what I did since last meeting
 *       "issue"  = what we need to discuss at next meeting
 * author: "Matt" | "Lynn"
 * business: "chiropractic" | "crossfit" | "general"
 */
export const boardCards = mysqlTable("board_cards", {
  id: int("id").autoincrement().primaryKey(),
  author: varchar("author", { length: 128 }).notNull(),
  type: mysqlEnum("type", ["update", "issue", "task"]).notNull(),
  business: mysqlEnum("business", ["chiropractic", "crossfit", "general"]).notNull().default("general"),
  title: varchar("title", { length: 160 }),
  content: text("content").notNull(),
  // Task-specific fields
  assignedTo: varchar("assignedTo", { length: 128 }),       // display name of assignee (legacy)
  assignedToPersonId: varchar("assignedToPersonId", { length: 64 }), // persons.id (new per-person auth)
  dueAt: bigint("dueAt", { mode: "number" }),               // optional due date (ms since epoch)
  completedAt: timestamp("completedAt"),                   // when doer marked it done
  completedBy: varchar("completedBy", { length: 128 }),    // who marked it done
  confirmedAt: timestamp("confirmedAt"),                   // when requester confirmed it done
  confirmedBy: varchar("confirmedBy", { length: 128 }),    // who confirmed it done
  // Issue-specific fields — meeting assignment
  meetingType: mysqlEnum("meetingType", ["daily_huddle", "weekly_meeting", "quarterly_review"]),  // which meeting to discuss in
  scheduledDate: bigint("scheduledDate", { mode: "number" }),  // ms since epoch — date of the meeting occurrence
  // Update-specific fields — date coverage
  updateDate: bigint("updateDate", { mode: "number" }),  // ms since epoch — date this update covers
  // Audience — which side of the wall this card belongs to
  audience: mysqlEnum("audience", ["owner", "team"]).notNull().default("owner"),
  // Attachments — JSON array of { key: string, url: string, name: string, mimeType: string, sizeBytes: number }
  attachmentsJson: text("attachmentsJson"), // JSON: Array<{ key, url, name, mimeType, sizeBytes }>
  // Priority — applies to tasks, issues, and needs_attention cards
  priority: mysqlEnum("priority", ["high", "medium", "low"]).default("medium"),
  // Legacy seen/archive fields (updates + issues)
  seenAt: timestamp("seenAt"),
  seenBy: varchar("seenBy", { length: 128 }),
  archivedAt: timestamp("archivedAt"),
  // Archive metadata
  archiveTopicTag: varchar("archiveTopicTag", { length: 128 }), // e.g. "Staffing", "Equipment", "Finance"
  archiveDecision: text("archiveDecision"), // optional summary of what was decided
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BoardCard = typeof boardCards.$inferSelect;
export type InsertBoardCard = typeof boardCards.$inferInsert;

/**
 * Stores customized agenda item templates per business per meeting type.
 * itemsJson is a JSON array of { key: string, label: string, sortOrder: number }.
 * One row per (business, meetingType) pair — upserted on save.
 */
export const agendaTemplates = mysqlTable("agenda_templates", {
  id: int("id").autoincrement().primaryKey(),
  business: mysqlEnum("business", ["chiropractic", "crossfit"]).notNull(),
  meetingType: mysqlEnum("meetingType", ["daily", "weekly", "monthly", "quarterly"]).notNull(),
  itemsJson: text("itemsJson").notNull(), // JSON: Array<{ key: string; label: string; sortOrder: number }>
  updatedBy: varchar("updatedBy", { length: 128 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AgendaTemplate = typeof agendaTemplates.$inferSelect;
export type InsertAgendaTemplate = typeof agendaTemplates.$inferInsert;

/**
 * Waitlist email signups for BusinessCadence.com marketing site.
 * Stores email addresses of interested users before product launch.
 */
export const waitlistEmails = mysqlTable("waitlist_emails", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  source: varchar("source", { length: 64 }).default("homepage").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WaitlistEmail = typeof waitlistEmails.$inferSelect;
export type InsertWaitlistEmail = typeof waitlistEmails.$inferInsert;

/**
 * App users — the three client accounts for the calendar app.
 * scope: "chiro" = New Beginnings Chiropractic only
 *        "crossfit" = Evolved CrossFit only
 *        "owner" = All three businesses (Matt & Lynn)
 * passwordHash: bcrypt hash of the user's password
 */
export const appUsers = mysqlTable("app_users", {
  id: int("id").autoincrement().primaryKey(),
  username: varchar("username", { length: 64 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  scope: mysqlEnum("scope", ["chiro", "crossfit", "owner"]).notNull(),
  displayName: varchar("displayName", { length: 128 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AppUser = typeof appUsers.$inferSelect;
export type InsertAppUser = typeof appUsers.$inferInsert;

/**
 * Business profile — created during onboarding for each app_user account.
 * Stores business info, work schedule, and meeting day preferences.
 * workDays: JSON array of day-of-week numbers (0=Sun, 1=Mon, ..., 6=Sat)
 * meetingDayPrefs: JSON object with preferred day-of-week for each cadence
 */
export const businessProfiles = mysqlTable("business_profiles", {
  id: int("id").autoincrement().primaryKey(),
  accountId: int("accountId").notNull(), // references app_users.id
  businessName: varchar("businessName", { length: 256 }).notNull(),
  industry: varchar("industry", { length: 64 }).notNull(),
  ownerCount: int("ownerCount").default(1).notNull(),
  employeeCount: int("employeeCount").default(0).notNull(),
  workDays: text("workDays").notNull(), // JSON: number[] e.g. [1,2,3,4,5]
  meetingDayPrefs: text("meetingDayPrefs").notNull(), // JSON: { ownerDaily, ownerWeekly, ownerMonthly, teamDaily, teamWeekly }
  meetingTimes: text("meetingTimes"), // JSON: { ownerDaily, ownerWeekly, ownerMonthly, quarterly, teamDaily, teamWeekly } — each value is "HH:MM" 24h string
  onboardingComplete: boolean("onboardingComplete").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BusinessProfile = typeof businessProfiles.$inferSelect;
export type InsertBusinessProfile = typeof businessProfiles.$inferInsert;

/**
 * Closed periods — days or weeks marked as closed for a business.
 * type: "day" = single date, "week" = full week (startDate = Monday of that week)
 * Meetings on closed dates are automatically rescheduled to next available day.
 */
export const closedPeriods = mysqlTable("closed_periods", {
  id: int("id").autoincrement().primaryKey(),
  accountId: int("accountId").notNull(), // references app_users.id
  startDate: varchar("startDate", { length: 10 }).notNull(), // YYYY-MM-DD
  endDate: varchar("endDate", { length: 10 }).notNull(),     // YYYY-MM-DD (same as startDate for single day)
  label: varchar("label", { length: 128 }), // e.g. "Christmas Week", "Staff Vacation"
  periodType: mysqlEnum("periodType", ["day", "week"]).default("day").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ClosedPeriod = typeof closedPeriods.$inferSelect;
export type InsertClosedPeriod = typeof closedPeriods.$inferInsert;

/**
 * Business hours — defines the working hours schedule for an account.
 * workDays: JSON number[] e.g. [1,2,3,4,5] (0=Sun, 6=Sat)
 * startTime / endTime: "HH:MM" 24h strings
 * timezone: IANA timezone string e.g. "America/New_York"
 */
export const businessHours = mysqlTable("business_hours", {
  id: int("id").autoincrement().primaryKey(),
  accountId: int("accountId").notNull().unique(), // one row per account
  workDays: text("workDays").notNull(), // JSON number[] — default [1,2,3,4,5] set in application layer
  startTime: varchar("startTime", { length: 5 }).notNull().default("08:00"), // HH:MM
  endTime: varchar("endTime", { length: 5 }).notNull().default("18:00"),   // HH:MM
  timezone: varchar("timezone", { length: 64 }).notNull().default("America/New_York"),
  manualDndActive: boolean("manualDndActive").default(false).notNull(), // manual "off the clock" toggle
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BusinessHours = typeof businessHours.$inferSelect;
export type InsertBusinessHours = typeof businessHours.$inferInsert;

/**
 * Meeting schedule overrides — tracks meetings that were auto-shifted due to closed periods.
 * originalDate: the date the meeting was originally scheduled
 * rescheduledDate: the date it was moved to
 */
export const meetingScheduleOverrides = mysqlTable("meeting_schedule_overrides", {
  id: int("id").autoincrement().primaryKey(),
  accountId: int("accountId").notNull(),
  originalDate: varchar("originalDate", { length: 10 }).notNull(), // YYYY-MM-DD
  meetingType: mysqlEnum("meetingType", ["daily", "weekly", "monthly", "quarterly"]).notNull(),
  rescheduledDate: varchar("rescheduledDate", { length: 10 }).notNull(), // YYYY-MM-DD
  reason: varchar("reason", { length: 256 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MeetingScheduleOverride = typeof meetingScheduleOverrides.$inferSelect;
export type InsertMeetingScheduleOverride = typeof meetingScheduleOverrides.$inferInsert;

/**
 * Employees — staff members whose weekly numbers the owner tracks.
 * Owned by an account (app_users.id).
 */
export const employees = mysqlTable("employees", {
  id: int("id").autoincrement().primaryKey(),
  accountId: int("accountId").notNull(), // references app_users.id
  name: varchar("name", { length: 128 }).notNull(),
  role: varchar("role", { length: 128 }).notNull(),
  businessSlug: varchar("businessSlug", { length: 64 }).default("").notNull(), // which business this employee belongs to
  isActive: boolean("isActive").default(true).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = typeof employees.$inferInsert;

/**
 * Employee metrics — the KPIs/responsibilities tracked for each employee.
 * Each employee can have multiple metrics (e.g. "Adjustments this week", "New patients MTD").
 */
export const employeeMetrics = mysqlTable("employee_metrics", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employeeId").notNull(), // references employees.id
  label: varchar("label", { length: 256 }).notNull(), // e.g. "Adjustments this week"
  unit: varchar("unit", { length: 32 }), // e.g. "#", "$", "%"
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EmployeeMetric = typeof employeeMetrics.$inferSelect;
export type InsertEmployeeMetric = typeof employeeMetrics.$inferInsert;

/**
 * Weekly reports — one per employee per week.
 * weekKey format: "YYYY-Www" (ISO week, e.g. "2026-W27")
 * submittedByOwnerId: the app_users.id of the owner who submitted (on behalf of employee)
 */
export const weeklyReports = mysqlTable("weekly_reports", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employeeId").notNull(),
  weekKey: varchar("weekKey", { length: 10 }).notNull(), // "YYYY-Www"
  submittedAt: timestamp("submittedAt").defaultNow().notNull(),
  submittedByOwnerId: int("submittedByOwnerId"), // app_users.id
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WeeklyReport = typeof weeklyReports.$inferSelect;
export type InsertWeeklyReport = typeof weeklyReports.$inferInsert;

/**
 * Weekly report entries — one row per metric per report.
 * value is stored as a float to support both integer counts and decimal percentages.
 */
export const weeklyReportEntries = mysqlTable("weekly_report_entries", {
  id: int("id").autoincrement().primaryKey(),
  reportId: int("reportId").notNull(),
  metricId: int("metricId").notNull(),
  value: double("value").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WeeklyReportEntry = typeof weeklyReportEntries.$inferSelect;
export type InsertWeeklyReportEntry = typeof weeklyReportEntries.$inferInsert;

/**
 * Goals — quarterly and annual goals per business per account.
 * period: "annual" = full year goal, "quarterly" = Q1/Q2/Q3/Q4
 * quarter: 1-4 (only relevant when period = "quarterly")
 * year: 4-digit year (e.g. 2026)
 * status: "active" | "achieved" | "missed" | "deferred"
 * business: which business this goal belongs to
 * owner: which owner set this goal ("Matt" | "Lynn" | "both")
 */
export const goals = mysqlTable("goals", {
  id: int("id").autoincrement().primaryKey(),
  accountId: int("accountId").notNull(), // references app_users.id
  business: mysqlEnum("business", ["chiropractic", "crossfit", "general"]).notNull().default("general"),
  period: mysqlEnum("period", ["annual", "quarterly"]).notNull().default("quarterly"),
  quarter: int("quarter"), // 1-4, null for annual goals
  year: int("year").notNull(),
  title: varchar("title", { length: 256 }).notNull(),
  description: text("description"),
  status: mysqlEnum("status", ["active", "achieved", "missed", "deferred"]).notNull().default("active"),
  owner: varchar("owner", { length: 128 }).notNull().default("both"),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Goal = typeof goals.$inferSelect;
export type InsertGoal = typeof goals.$inferInsert;

/**
 * Persons — individual user accounts for per-person authentication.
 * role: "owner" = business owner (full access to all their businesses)
 *       "coowner" = co-owner (full access to shared businesses)
 *       "employee" = employee (scoped to one business, board + KPIs only)
 * businessScope: JSON array of business slugs this person can access
 * inviteToken: one-time token sent via email for self-signup
 * inviteAccepted: true once the person has set their password
 */
export const persons = mysqlTable("persons", {
  id: varchar("id", { length: 64 }).primaryKey(), // nanoid
  accountId: int("accountId").notNull(),           // references app_users.id (the business account)
  name: varchar("name", { length: 128 }).notNull(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  role: mysqlEnum("role", ["owner", "coowner", "employee"]).notNull().default("employee"),
  businessScope: varchar("businessScope", { length: 1024 }).notNull().default("[]"), // JSON: string[] of business slugs
  passwordHash: varchar("passwordHash", { length: 255 }),
  inviteToken: varchar("inviteToken", { length: 128 }),
  inviteAccepted: boolean("inviteAccepted").default(false).notNull(),
  passwordResetToken: varchar("passwordResetToken", { length: 128 }),
  passwordResetExpiry: timestamp("passwordResetExpiry"),
  /** One-time token the owner generates to invite their partner (co-owner) to share their subscription. */
  partnerInviteToken: varchar("partnerInviteToken", { length: 128 }),
  /** Business name stored alongside the partner invite token so the intro screen can personalize the CTA. */
  partnerInviteBusinessName: varchar("partnerInviteBusinessName", { length: 256 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Person = typeof persons.$inferSelect;
export type InsertPerson = typeof persons.$inferInsert;

/**
 * KPI Categories — configurable KPI metrics per business.
 * frequency: "weekly" = submitted each week, "monthly" = submitted each month
 * isActive: soft-delete flag
 */
export const kpiCategories = mysqlTable("kpi_categories", {
  id: int("id").autoincrement().primaryKey(),
  accountId: int("accountId").notNull(),
  businessSlug: varchar("businessSlug", { length: 64 }).notNull(), // e.g. "chiropractic"
  name: varchar("name", { length: 256 }).notNull(),
  unit: varchar("unit", { length: 32 }).default("#").notNull(), // "#", "$", "%"
  frequency: mysqlEnum("frequency", ["weekly", "monthly"]).default("weekly").notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  /**
   * monthlyTarget: optional numeric goal for this KPI per month.
   * Used for the running total vs goal cross-reference in the owner dashboard.
   */
  monthlyTarget: double("monthlyTarget"),
  /**
   * showGoalToStaff: if true, employees can see the monthly target when submitting KPIs.
   * Defaults to false so sensitive targets (e.g. collections) stay owner-only.
   */
  showGoalToStaff: boolean("showGoalToStaff").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type KpiCategory = typeof kpiCategories.$inferSelect;
export type InsertKpiCategory = typeof kpiCategories.$inferInsert;

/**
 * KPI Entries — individual submissions per person per period.
 * periodKey: "YYYY-Www" for weekly (e.g. "2026-W27") or "YYYY-MM" for monthly
 */
export const kpiEntries = mysqlTable("kpi_entries", {
  id: int("id").autoincrement().primaryKey(),
  categoryId: int("categoryId").notNull(),
  personId: varchar("personId", { length: 64 }).notNull(), // references persons.id
  accountId: int("accountId").notNull(),
  value: double("value").notNull(),
  periodKey: varchar("periodKey", { length: 10 }).notNull(), // "YYYY-Www" or "YYYY-MM"
  submittedAt: timestamp("submittedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type KpiEntry = typeof kpiEntries.$inferSelect;
export type InsertKpiEntry = typeof kpiEntries.$inferInsert;

/**
 * Businesses — the actual businesses owned by an account.
 * Created during onboarding; drives all business-scoped UI.
 * slug: short identifier used throughout the app (e.g. "chiropractic", "crossfit")
 */
export const businesses = mysqlTable("businesses", {
  id: int("id").autoincrement().primaryKey(),
  accountId: int("accountId").notNull(),
  name: varchar("name", { length: 256 }).notNull(),
  slug: varchar("slug", { length: 64 }).notNull(),
  icon: varchar("icon", { length: 8 }).default("🏢").notNull(),
  color: varchar("color", { length: 16 }).default("#64748B").notNull(),
  logoUrl: text("logoUrl"),  // S3 URL for business logo (optional)
  sortOrder: int("sortOrder").default(0).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Business = typeof businesses.$inferSelect;
export type InsertBusiness = typeof businesses.$inferInsert;

/**
 * Report Questions — owner-configured questions for weekly employee check-ins.
 * businessId references businesses.id (0 = applies to all businesses)
 */
export const reportQuestions = mysqlTable("report_questions", {
  id: int("id").autoincrement().primaryKey(),
  accountId: int("accountId").notNull(),
  businessId: int("businessId").notNull().default(0), // 0 = all businesses
  question: varchar("question", { length: 512 }).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ReportQuestion = typeof reportQuestions.$inferSelect;
export type InsertReportQuestion = typeof reportQuestions.$inferInsert;

/**
 * Report Answers — employee weekly check-in submissions.
 * weekKey format: "YYYY-Www" (e.g. "2026-W27")
 */
export const reportAnswers = mysqlTable("report_answers", {
  id: int("id").autoincrement().primaryKey(),
  questionId: int("questionId").notNull(),
  personId: varchar("personId", { length: 64 }).notNull(),
  accountId: int("accountId").notNull(),
  weekKey: varchar("weekKey", { length: 10 }).notNull(),
  answer: text("answer").notNull(),
  submittedAt: timestamp("submittedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ReportAnswer = typeof reportAnswers.$inferSelect;
export type InsertReportAnswer = typeof reportAnswers.$inferInsert;

/**
 * In-app notifications — per-person alerts for board events.
 * type: "task_assigned" | "task_done_pending" | "task_confirmed" | "new_update" | "new_issue" | "overdue_task"
 * recipientPersonId references persons.id (the person who should see this notification)
 * linkTo: optional route to navigate to when tapped (e.g. "/app/board")
 */
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  accountId: int("accountId").notNull(),
  recipientPersonId: varchar("recipientPersonId", { length: 64 }).notNull(),
  type: mysqlEnum("type", ["task_assigned", "task_done_pending", "task_confirmed", "new_update", "new_issue", "overdue_task", "partner_joined"]).notNull(),
  title: varchar("title", { length: 256 }).notNull(),
  body: varchar("body", { length: 512 }).notNull(),
  linkTo: varchar("linkTo", { length: 256 }).default("/app/board").notNull(),
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

/**
 * Registered native devices used only to deliver a notification badge to the
 * account holder’s own iPhone or Android device. Tokens are never sent to the
 * browser or exposed through a read procedure.
 */
export const pushDevices = mysqlTable("push_devices", {
  id: int("id").autoincrement().primaryKey(),
  accountId: int("accountId").notNull(),
  personId: varchar("personId", { length: 64 }).notNull(),
  platform: mysqlEnum("platform", ["ios", "android"]).notNull(),
  token: varchar("token", { length: 512 }).notNull(),
  lastSeenAt: timestamp("lastSeenAt").defaultNow().onUpdateNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("push_devices_token_idx").on(table.token),
  uniqueIndex("push_devices_person_platform_token_idx").on(table.personId, table.platform, table.token),
]);
export type PushDevice = typeof pushDevices.$inferSelect;

/**
 * Board card comments — threaded comments on Tasks, Issues, and Updates.
 * cardId: references board_cards.id
 * authorName: display name of the commenter (e.g. "Lynn", "Matt")
 * authorPersonId: persons.id of the commenter (nullable for legacy)
 * content: the comment text
 */
export const boardComments = mysqlTable("board_comments", {
  id: int("id").autoincrement().primaryKey(),
  cardId: int("cardId").notNull(),             // references board_cards.id
  authorName: varchar("authorName", { length: 128 }).notNull(),
  authorPersonId: varchar("authorPersonId", { length: 64 }), // references persons.id
  content: text("content").notNull(),
  attachmentsJson: text("attachmentsJson"), // JSON: Array<{ key, url, name, mimeType, sizeBytes }>
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BoardComment = typeof boardComments.$inferSelect;
export type InsertBoardComment = typeof boardComments.$inferInsert;

/**
 * Team Calendar Settings — controls which meeting types are visible on the Team Calendar.
 * One row per account. All types default to true (visible).
 * Owners can toggle each type off to hide it from employees.
 */
export const teamCalendarSettings = mysqlTable("team_calendar_settings", {
  id: int("id").autoincrement().primaryKey(),
  accountId: int("accountId").notNull().unique(), // references app_users.id
  showDaily: boolean("showDaily").default(true).notNull(),
  showWeekly: boolean("showWeekly").default(true).notNull(),
  showMonthly: boolean("showMonthly").default(true).notNull(),
  showQuarterly: boolean("showQuarterly").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TeamCalendarSettings = typeof teamCalendarSettings.$inferSelect;
export type InsertTeamCalendarSettings = typeof teamCalendarSettings.$inferInsert;

/**
 * Subscriptions — tracks RevenueCat subscription state per account.
 * One row per account (upserted on each RevenueCat webhook event).
 *
 * plan:   "core"      = $79/mo — owners only
 *         "core_team" = $99/mo — owners + team employees
 * status: "trialing"  = within 14-day free trial
 *         "active"    = paid subscription current
 *         "lapsed"    = subscription cancelled or payment failed
 *         "cancelled" = owner explicitly cancelled (access until period end)
 *
 * revenueCatUserId: the RevenueCat app_user_id (we use persons.id as the RC user ID)
 * revenueCatData:   raw JSON from the latest RevenueCat webhook event (for debugging)
 */
export const subscriptions = mysqlTable("subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  accountId: int("accountId").notNull().unique(), // references app_users.id — one sub per account
  ownerPersonId: varchar("ownerPersonId", { length: 64 }).notNull(), // the person who purchased
  revenueCatUserId: varchar("revenueCatUserId", { length: 256 }),    // RC app_user_id
  revenueCatProductId: varchar("revenueCatProductId", { length: 256 }), // e.g. "bc_core_monthly"
  plan: mysqlEnum("plan", ["core", "core_team", "founding", "co_owner", "co_owner_team"]).notNull().default("co_owner"),
  status: mysqlEnum("status", ["trialing", "active", "lapsed", "cancelled", "beta"]).notNull().default("trialing"),
  trialEndsAt: timestamp("trialEndsAt"),           // null after trial converts
  currentPeriodEndsAt: timestamp("currentPeriodEndsAt"), // next renewal / access end date
  revenueCatData: text("revenueCatData"),          // JSON: latest RC webhook payload
  /** betaGrantedBy: openId of the admin who granted beta access (null for paid subs) */
  betaGrantedBy: varchar("betaGrantedBy", { length: 64 }),
  /** betaNote: optional note explaining why beta access was granted */
  betaNote: varchar("betaNote", { length: 256 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;

/**
 * Partner Links — maps a co-owner (partner) person to the paying owner's account.
 * When a partner accepts a partner invite, a row is inserted here.
 * The server checks this table to grant access without requiring the partner
 * to have their own RevenueCat subscription.
 *
 * ownerPersonId:   the person who sent the invite (must be role=owner)
 * partnerPersonId: the person who accepted the invite (role=coowner)
 * accountId:       the shared app_users account both persons belong to
 */
export const partnerLinks = mysqlTable("partner_links", {
  id: int("id").autoincrement().primaryKey(),
  accountId: int("accountId").notNull(),                              // references app_users.id
  ownerPersonId: varchar("ownerPersonId", { length: 64 }).notNull(), // references persons.id
  partnerPersonId: varchar("partnerPersonId", { length: 64 }).notNull().unique(), // references persons.id
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PartnerLink = typeof partnerLinks.$inferSelect;
export type InsertPartnerLink = typeof partnerLinks.$inferInsert;

/**
 * Owner Messages — private message thread between co-owners (e.g. Matt ↔ Lynn).
 * Scoped to an accountId so only owners on the same account can see messages.
 */
export const ownerMessages = mysqlTable("owner_messages", {
  id: int("id").autoincrement().primaryKey(),
  accountId: int("accountId").notNull(),
  fromPersonId: varchar("fromPersonId", { length: 64 }).notNull(),
  toPersonId: varchar("toPersonId", { length: 64 }).notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type OwnerMessage = typeof ownerMessages.$inferSelect;
export type InsertOwnerMessage = typeof ownerMessages.$inferInsert;

/**
 * Announcements — owner-to-employee broadcast messages.
 * toPersonId = null means "all employees on this account".
 * toPersonId set = message to a specific employee.
 */
export const announcements = mysqlTable("announcements", {
  id: int("id").autoincrement().primaryKey(),
  accountId: int("accountId").notNull(),
  fromPersonId: varchar("fromPersonId", { length: 64 }).notNull(),
  toPersonId: varchar("toPersonId", { length: 64 }), // null = all employees
  body: text("body").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Announcement = typeof announcements.$inferSelect;
export type InsertAnnouncement = typeof announcements.$inferInsert;


/**
 * Meeting Notes — typed notes saved per meeting by owners.
 * meetingType: the cadence type (daily/weekly/monthly/quarterly)
 * meetingDate: the date of the meeting (YYYY-MM-DD)
 * body: the typed note content
 */
export const meetingNotes = mysqlTable("meeting_notes", {
  id: int("id").autoincrement().primaryKey(),
  accountId: int("accountId").notNull(),
  personId: varchar("personId", { length: 64 }).notNull(),
  businessId: int("businessId").notNull().default(0),
  meetingType: mysqlEnum("meetingType", ["daily", "weekly", "monthly", "quarterly"]).notNull().default("weekly"),
  meetingDate: varchar("meetingDate", { length: 10 }).notNull(), // YYYY-MM-DD
  body: text("body").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type MeetingNote = typeof meetingNotes.$inferSelect;
export type InsertMeetingNote = typeof meetingNotes.$inferInsert;

/**
 * Person Hours — per-partner independent business hours / DND settings.
 * Each owner sets their own on/off schedule independently.
 * Falls back to account-level business_hours if no row exists for this person.
 * workDays: JSON number[] e.g. [1,2,3,4,5] (0=Sun, 6=Sat)
 * startTime / endTime: "HH:MM" 24h strings
 */
export const personHours = mysqlTable("person_hours", {
  id: int("id").autoincrement().primaryKey(),
  accountId: int("accountId").notNull(),
  personId: varchar("personId", { length: 64 }).notNull(),
  workDays: text("workDays").notNull().default("[1,2,3,4,5]"), // JSON number[]
  startTime: varchar("startTime", { length: 5 }).notNull().default("08:00"), // HH:MM
  endTime: varchar("endTime", { length: 5 }).notNull().default("18:00"),     // HH:MM
  timezone: varchar("timezone", { length: 64 }).notNull().default("America/New_York"),
  manualDndActive: boolean("manualDndActive").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type PersonHours = typeof personHours.$inferSelect;
export type InsertPersonHours = typeof personHours.$inferInsert;
