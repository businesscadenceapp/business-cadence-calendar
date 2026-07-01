import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean } from "drizzle-orm/mysql-core";

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
 * Command Board cards — shared updates and issues between Matt and Lynn.
 * type: "update" = what I did since last meeting
 *       "issue"  = what we need to discuss at next meeting
 * author: "Matt" | "Lynn"
 * business: "chiropractic" | "crossfit" | "realty" | "general"
 */
export const boardCards = mysqlTable("board_cards", {
  id: int("id").autoincrement().primaryKey(),
  author: mysqlEnum("author", ["Matt", "Lynn"]).notNull(),
  type: mysqlEnum("type", ["update", "issue"]).notNull(),
  business: mysqlEnum("business", ["chiropractic", "crossfit", "realty", "general"]).notNull().default("general"),
  content: text("content").notNull(),
  seenAt: timestamp("seenAt"),
  seenBy: mysqlEnum("seenBy", ["Matt", "Lynn"]),
  archivedAt: timestamp("archivedAt"),
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
  business: mysqlEnum("business", ["chiropractic", "crossfit", "realty"]).notNull(),
  meetingType: mysqlEnum("meetingType", ["daily", "weekly", "monthly", "quarterly"]).notNull(),
  itemsJson: text("itemsJson").notNull(), // JSON: Array<{ key: string; label: string; sortOrder: number }>
  updatedBy: mysqlEnum("updatedBy", ["Matt", "Lynn"]).notNull(),
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
 * Stores meeting recordings, transcripts, and AI-generated notes.
 * Linked to a meeting_logs row by meetingLogId.
 * audioKey: S3 storage key for the raw audio file
 * transcript: full Whisper transcription text
 * aiNotes: AI-generated structured notes (JSON string with summary, actionItems, resolvedItems)
 */
export const meetingRecordings = mysqlTable("meeting_recordings", {
  id: int("id").autoincrement().primaryKey(),
  meetingLogId: int("meetingLogId").notNull(),
  audioKey: varchar("audioKey", { length: 512 }),
  transcript: text("transcript"),
  aiNotes: text("aiNotes"), // JSON: { summary: string, actionItems: string[], resolvedItems: string[], keyDecisions: string[] }
  processingStatus: mysqlEnum("processingStatus", ["pending", "processing", "done", "error"]).default("pending").notNull(),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MeetingRecording = typeof meetingRecordings.$inferSelect;
export type InsertMeetingRecording = typeof meetingRecordings.$inferInsert;