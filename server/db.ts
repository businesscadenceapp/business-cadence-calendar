import { eq, and, desc, inArray, asc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, meetingLogs, agendaItems, MeetingLog, AgendaItem, boardCards, agendaTemplates, type BoardCard, type InsertBoardCard, waitlistEmails, businessProfiles, type BusinessProfile, closedPeriods, type ClosedPeriod, meetingScheduleOverrides, employees, employeeMetrics, weeklyReports, weeklyReportEntries, type Employee, type EmployeeMetric, type WeeklyReport, type WeeklyReportEntry, goals, type Goal, type InsertGoal, notifications, type Notification, businessHours, type BusinessHours, subscriptions, type Subscription, type InsertSubscription, partnerLinks, type PartnerLink, ownerMessages, type OwnerMessage, announcements, type Announcement } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ─── Meeting Log helpers ──────────────────────────────────────────────────────

export async function getMeetingLog(dateKey: string, meetingType: MeetingLog["meetingType"]): Promise<MeetingLog | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(meetingLogs)
    .where(and(eq(meetingLogs.dateKey, dateKey), eq(meetingLogs.meetingType, meetingType)))
    .limit(1);
  return result[0];
}

export async function upsertMeetingLog(
  dateKey: string,
  meetingType: MeetingLog["meetingType"],
  notes: string
): Promise<MeetingLog> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await getMeetingLog(dateKey, meetingType);
  if (existing) {
    await db.update(meetingLogs)
      .set({ notes, updatedAt: new Date() })
      .where(eq(meetingLogs.id, existing.id));
    return { ...existing, notes, updatedAt: new Date() };
  } else {
    await db.insert(meetingLogs).values({ dateKey, meetingType, notes });
    const created = await getMeetingLog(dateKey, meetingType);
    return created!;
  }
}

export async function getAllLoggedDates(): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({ dateKey: meetingLogs.dateKey }).from(meetingLogs);
  const seen = new Set<string>();
  rows.forEach(r => seen.add(r.dateKey));
  return Array.from(seen);
}

export async function saveSummary(
  dateKey: string,
  meetingType: MeetingLog["meetingType"],
  aiSummary: string
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await getMeetingLog(dateKey, meetingType);
  if (existing) {
    await db.update(meetingLogs)
      .set({ aiSummary, summaryGeneratedAt: new Date(), updatedAt: new Date() })
      .where(eq(meetingLogs.id, existing.id));
  } else {
    await db.insert(meetingLogs).values({ dateKey, meetingType, aiSummary, summaryGeneratedAt: new Date() });
  }
}

// ─── Agenda Item helpers ──────────────────────────────────────────────────────

export async function getAgendaItems(meetingLogId: number): Promise<AgendaItem[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(agendaItems).where(eq(agendaItems.meetingLogId, meetingLogId));
}

export async function toggleAgendaItem(
  meetingLogId: number,
  itemKey: string,
  completed: boolean,
  comment?: string
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select().from(agendaItems)
    .where(and(eq(agendaItems.meetingLogId, meetingLogId), eq(agendaItems.itemKey, itemKey)))
    .limit(1);
  const updatePayload: Record<string, unknown> = { completed, updatedAt: new Date() };
  if (comment !== undefined) updatePayload.comment = comment;
  if (existing.length > 0) {
    await db.update(agendaItems).set(updatePayload).where(eq(agendaItems.id, existing[0].id));
  } else {
    await db.insert(agendaItems).values({ meetingLogId, itemKey, completed, comment: comment ?? null });
  }
}

// ─── Owner Board helpers ────────────────────────────────────────────────────

export async function getBoardCards(includeArchived = false, audience?: "owner" | "team"): Promise<BoardCard[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(boardCards).orderBy(boardCards.createdAt);
  const active = includeArchived ? rows : rows.filter(r => r.archivedAt === null);
  if (audience) return active.filter(r => r.audience === audience);
  return active;
}

export async function createBoardCard(
  data: Pick<InsertBoardCard, "type" | "business" | "content"> & {
    author: string;
    assignedTo?: string;
    assignedToPersonId?: string;
    dueAt?: number;
    meetingType?: "daily_huddle" | "weekly_meeting" | "quarterly_review";
    scheduledDate?: number;
    updateDate?: number;
    audience?: "owner" | "team";
    priority?: "high" | "medium" | "low";
  }
): Promise<BoardCard> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(boardCards).values(data);
  const rows = await db
    .select()
    .from(boardCards)
    .orderBy(boardCards.createdAt);
  return rows[rows.length - 1]!;
}

export async function markTaskDone(id: number, completedBy: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(boardCards)
    .set({ completedAt: new Date(), completedBy })
    .where(eq(boardCards.id, id));
}

export async function confirmTaskDone(id: number, confirmedBy: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  // Confirming done also archives the card so it leaves the active board
  await db
    .update(boardCards)
    .set({ confirmedAt: new Date(), confirmedBy, archivedAt: new Date() })
    .where(eq(boardCards.id, id));
}

export async function markCardSeen(id: number, seenBy: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(boardCards)
    .set({ seenAt: new Date(), seenBy })
    .where(eq(boardCards.id, id));
}

export async function archiveCard(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(boardCards)
    .set({ archivedAt: new Date() })
    .where(eq(boardCards.id, id));
}

export async function deleteBoardCard(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(boardCards).where(eq(boardCards.id, id));
}

// ─── Agenda Template helpers ──────────────────────────────────────────────────

export type AgendaTemplateItem = { key: string; label: string; sortOrder: number };

export async function getAgendaTemplate(
  business: "chiropractic" | "crossfit",
  meetingType: "daily" | "weekly" | "monthly" | "quarterly"
): Promise<AgendaTemplateItem[] | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(agendaTemplates)
    .where(and(eq(agendaTemplates.business, business), eq(agendaTemplates.meetingType, meetingType)))
    .limit(1);
  if (rows.length === 0) return null;
  try { return JSON.parse(rows[0].itemsJson) as AgendaTemplateItem[]; } catch { return null; }
}

export async function getAllAgendaTemplates(): Promise<
  Array<{ business: string; meetingType: string; items: AgendaTemplateItem[]; updatedBy: string; updatedAt: Date }>
> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(agendaTemplates);
  return rows.map((r) => ({
    business: r.business,
    meetingType: r.meetingType,
    items: (() => { try { return JSON.parse(r.itemsJson); } catch { return []; } })(),
    updatedBy: r.updatedBy,
    updatedAt: r.updatedAt,
  }));
}

export async function upsertAgendaTemplate(
  business: "chiropractic" | "crossfit",
  meetingType: "daily" | "weekly" | "monthly" | "quarterly",
  items: AgendaTemplateItem[],
  updatedBy: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const existing = await db
    .select()
    .from(agendaTemplates)
    .where(and(eq(agendaTemplates.business, business), eq(agendaTemplates.meetingType, meetingType)))
    .limit(1);
  const itemsJson = JSON.stringify(items);
  if (existing.length > 0) {
    await db.update(agendaTemplates).set({ itemsJson, updatedBy }).where(eq(agendaTemplates.id, existing[0].id));
  } else {
    await db.insert(agendaTemplates).values({ business, meetingType, itemsJson, updatedBy });
  }
}

/** Add an email to the waitlist. Returns { success, alreadyExists }. */
export async function addWaitlistEmail(email: string): Promise<{ success: boolean; alreadyExists: boolean }> {
  const db = await getDb();
  if (!db) return { success: false, alreadyExists: false };
  // Check for duplicate
  const existing = await db
    .select()
    .from(waitlistEmails)
    .where(eq(waitlistEmails.email, email.toLowerCase().trim()))
    .limit(1);
  if (existing.length > 0) return { success: true, alreadyExists: true };
  await db.insert(waitlistEmails).values({ email: email.toLowerCase().trim() });
  return { success: true, alreadyExists: false };
}

/** Get total waitlist count for the owner dashboard. */
export async function getWaitlistCount(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const rows = await db.select().from(waitlistEmails);
  return rows.length;
}

/** Get all waitlist emails for the admin panel. */
export async function getWaitlistEmails(): Promise<{ id: number; email: string; createdAt: Date }[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(waitlistEmails).orderBy(desc(waitlistEmails.createdAt));
  return rows as { id: number; email: string; createdAt: Date }[];
}

// ─── Business Profile / Onboarding helpers ──────────────────────────────────────────

/** Get the business profile for an account. Returns null if onboarding not done. */
export async function getBusinessProfile(accountId: number): Promise<BusinessProfile | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(businessProfiles)
    .where(eq(businessProfiles.accountId, accountId))
    .limit(1);
  return rows[0] ?? null;
}

/** Save or update the business profile for an account. */
export async function upsertBusinessProfile(data: {
  accountId: number;
  businessName: string;
  industry: string;
  ownerCount: number;
  employeeCount: number;
  workDays: number[];
  meetingDayPrefs: {
    ownerDaily: number[];  // multi-day
    ownerWeekly: number;
    ownerMonthly: number;
    quarterlyDay: number;
    teamDaily: number[];  // multi-day
    teamWeekly: number;
    ownerDailyEnabled?: boolean;
    ownerWeeklyEnabled?: boolean;
    ownerMonthlyEnabled?: boolean;
    quarterlyEnabled?: boolean;
    teamDailyEnabled?: boolean;
    teamWeeklyEnabled?: boolean;
  };
  onboardingComplete: boolean;
  meetingTimes?: {
    ownerDaily?: string;
    ownerWeekly?: string;
    ownerMonthly?: string;
    quarterly?: string;
    teamDaily?: string;
    teamWeekly?: string;
  } | null;
}): Promise<BusinessProfile> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const workDaysJson = JSON.stringify(data.workDays);
  const prefsJson = JSON.stringify(data.meetingDayPrefs);
  const timesJson = data.meetingTimes ? JSON.stringify(data.meetingTimes) : null;
  const existing = await getBusinessProfile(data.accountId);
  if (existing) {
    await db.update(businessProfiles).set({
      businessName: data.businessName,
      industry: data.industry,
      ownerCount: data.ownerCount,
      employeeCount: data.employeeCount,
      workDays: workDaysJson,
      meetingDayPrefs: prefsJson,
      meetingTimes: timesJson ?? existing.meetingTimes,
      onboardingComplete: data.onboardingComplete,
    }).where(eq(businessProfiles.id, existing.id));
    return (await getBusinessProfile(data.accountId))!;
  } else {
    await db.insert(businessProfiles).values({
      accountId: data.accountId,
      businessName: data.businessName,
      industry: data.industry,
      ownerCount: data.ownerCount,
      employeeCount: data.employeeCount,
      workDays: workDaysJson,
      meetingDayPrefs: prefsJson,
      meetingTimes: timesJson,
      onboardingComplete: data.onboardingComplete,
    });
    return (await getBusinessProfile(data.accountId))!;
  }
}

// ─── Closed Periods helpers ─────────────────────────────────────────────────────────────

/** Get all closed periods for an account. */
export async function getClosedPeriods(accountId: number): Promise<ClosedPeriod[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(closedPeriods).where(eq(closedPeriods.accountId, accountId));
}

/** Add a closed period for an account. */
export async function addClosedPeriod(data: {
  accountId: number;
  startDate: string;
  endDate: string;
  label?: string;
  periodType: "day" | "week";
}): Promise<ClosedPeriod> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(closedPeriods).values(data);
  const rows = await db
    .select()
    .from(closedPeriods)
    .where(and(eq(closedPeriods.accountId, data.accountId), eq(closedPeriods.startDate, data.startDate)))
    .orderBy(desc(closedPeriods.createdAt))
    .limit(1);
  return rows[0];
}

/** Remove a closed period by id. */
export async function removeClosedPeriod(id: number, accountId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(closedPeriods).where(and(eq(closedPeriods.id, id), eq(closedPeriods.accountId, accountId)));
}

/** Save a meeting schedule override (rescheduled meeting). */
export async function saveMeetingOverride(data: {
  accountId: number;
  originalDate: string;
  meetingType: "daily" | "weekly" | "monthly" | "quarterly";
  rescheduledDate: string;
  reason?: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;
  // Remove any existing override for this date+type first
  await db.delete(meetingScheduleOverrides).where(
    and(
      eq(meetingScheduleOverrides.accountId, data.accountId),
      eq(meetingScheduleOverrides.originalDate, data.originalDate),
      eq(meetingScheduleOverrides.meetingType, data.meetingType)
    )
  );
  if (data.originalDate !== data.rescheduledDate) {
    await db.insert(meetingScheduleOverrides).values(data);
  }
}

/** Get all meeting schedule overrides for an account. */
export async function getMeetingOverrides(accountId: number): Promise<typeof meetingScheduleOverrides.$inferSelect[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(meetingScheduleOverrides).where(eq(meetingScheduleOverrides.accountId, accountId));
}

/**
 * Recalculate all meeting schedule overrides for an account.
 * Clears existing overrides and regenerates from current closed periods + business profile.
 * Called after any closed period add/remove.
 */
import type { MeetingDayPrefs, ClosedPeriod as EnginePeriod, ScheduledMeeting } from "../shared/calendarEngine";

export async function recalculateOverrides(
  accountId: number,
  generateMeetingScheduleFn: (params: {
    year: number;
    workDays: number[];
    meetingDayPrefs: MeetingDayPrefs;
    closedPeriods: EnginePeriod[];
  }) => ScheduledMeeting[]
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  try {
    const profile = await getBusinessProfile(accountId);
    if (!profile?.meetingDayPrefs || !profile?.workDays) return;
    const workDays = JSON.parse(profile.workDays) as number[];
    const meetingDayPrefs = JSON.parse(profile.meetingDayPrefs);
    const allClosedPeriods = await getClosedPeriods(accountId);
    const closedForEngine = allClosedPeriods.map(p => ({ startDate: p.startDate, endDate: p.endDate }));
    const year = new Date().getFullYear();
    const meetings = generateMeetingScheduleFn({ year, workDays, meetingDayPrefs, closedPeriods: closedForEngine });
    // Clear all existing overrides for this account
    await db.delete(meetingScheduleOverrides).where(eq(meetingScheduleOverrides.accountId, accountId));
    // Insert fresh overrides for rescheduled meetings
    const rescheduled = meetings.filter(m => m.isRescheduled && m.originalDate);
    for (const m of rescheduled) {
      await db.insert(meetingScheduleOverrides).values({
        accountId,
        originalDate: m.originalDate!,
        meetingType: m.meetingType,
        rescheduledDate: m.date,
        reason: "Closed period",
      });
    }
  } catch (err) {
    console.error("[recalculateOverrides] Failed:", err);
  }
}

// ─── Weekly Report Helpers ───────────────────────────────────────────────────

/** Get all active employees with their metrics for an account. */
export async function getEmployeesWithMetrics(accountId: number, businessSlug?: string): Promise<
  Array<Employee & { metrics: EmployeeMetric[] }>
> {
  const db = await getDb();
  if (!db) return [];
  const whereClause = businessSlug
    ? and(eq(employees.accountId, accountId), eq(employees.isActive, true), eq(employees.businessSlug, businessSlug))
    : and(eq(employees.accountId, accountId), eq(employees.isActive, true));
  const emps = await db
    .select()
    .from(employees)
    .where(whereClause)
    .orderBy(employees.sortOrder, employees.id);
  if (emps.length === 0) return [];
  const empIds = emps.map((e) => e.id);
  const metrics = await db
    .select()
    .from(employeeMetrics)
    .where(inArray(employeeMetrics.employeeId, empIds))
    .orderBy(employeeMetrics.sortOrder, employeeMetrics.id);
  // Group metrics by employeeId
  const metricsByEmp = new Map<number, EmployeeMetric[]>();
  for (const m of metrics) {
    if (!metricsByEmp.has(m.employeeId)) metricsByEmp.set(m.employeeId, []);
    metricsByEmp.get(m.employeeId)!.push(m);
  }
  return emps.map((e) => ({ ...e, metrics: metricsByEmp.get(e.id) ?? [] }));
}

/** Upsert an employee and replace all their metrics. Returns the employee id. */
export async function saveEmployee(data: {
  accountId: number;
  id?: number;
  name: string;
  role: string;
  businessSlug: string;
  sortOrder?: number;
  metrics: Array<{ label: string; unit?: string; sortOrder?: number }>;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  let empId = data.id;
  if (empId) {
    await db
      .update(employees)
      .set({ name: data.name, role: data.role, businessSlug: data.businessSlug, sortOrder: data.sortOrder ?? 0, updatedAt: new Date() })
      .where(and(eq(employees.id, empId), eq(employees.accountId, data.accountId)));
  } else {
    const [result] = await db.insert(employees).values({
      accountId: data.accountId,
      name: data.name,
      role: data.role,
      businessSlug: data.businessSlug,
      sortOrder: data.sortOrder ?? 0,
    });
    empId = (result as any).insertId as number;
  }

  // Replace metrics: delete old, insert new
  await db.delete(employeeMetrics).where(eq(employeeMetrics.employeeId, empId!));
  if (data.metrics.length > 0) {
    await db.insert(employeeMetrics).values(
      data.metrics.map((m, i) => ({
        employeeId: empId!,
        label: m.label,
        unit: m.unit ?? "#",
        sortOrder: m.sortOrder ?? i,
      }))
    );
  }
  return empId!;
}

/** Soft-delete an employee (set isActive = false). */
export async function deactivateEmployee(employeeId: number, accountId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(employees)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(employees.id, employeeId), eq(employees.accountId, accountId)));
}

/** Submit (or overwrite) a weekly report for one employee for a given weekKey. */
export async function submitWeeklyReport(data: {
  employeeId: number;
  weekKey: string;
  submittedByOwnerId: number;
  entries: Array<{ metricId: number; value: number }>;
}): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Upsert the report row
  const existing = await db
    .select()
    .from(weeklyReports)
    .where(and(eq(weeklyReports.employeeId, data.employeeId), eq(weeklyReports.weekKey, data.weekKey)))
    .limit(1);

  let reportId: number;
  if (existing.length > 0) {
    reportId = existing[0].id;
    await db
      .update(weeklyReports)
      .set({ submittedAt: new Date(), submittedByOwnerId: data.submittedByOwnerId, updatedAt: new Date() })
      .where(eq(weeklyReports.id, reportId));
    // Delete old entries
    await db.delete(weeklyReportEntries).where(eq(weeklyReportEntries.reportId, reportId));
  } else {
    const [result] = await db.insert(weeklyReports).values({
      employeeId: data.employeeId,
      weekKey: data.weekKey,
      submittedByOwnerId: data.submittedByOwnerId,
    });
    reportId = (result as any).insertId as number;
  }

  // Insert entries
  if (data.entries.length > 0) {
    await db.insert(weeklyReportEntries).values(
      data.entries.map((e) => ({ reportId, metricId: e.metricId, value: e.value }))
    );
  }
}

/** Get weekly report data for all employees for a given account + weekKey. */
export async function getWeeklyReportSummary(accountId: number, weekKey: string, prevWeekKey: string, businessSlug?: string): Promise<
  Array<{
    employee: Employee;
    metrics: EmployeeMetric[];
    thisWeek: Record<number, number>; // metricId -> value
    lastWeek: Record<number, number>;
    submitted: boolean;
  }>
> {
  const db = await getDb();
  if (!db) return [];

  const empsWithMetrics = await getEmployeesWithMetrics(accountId, businessSlug);
  if (empsWithMetrics.length === 0) return [];

  const empIds = empsWithMetrics.map((e) => e.id);

  // Fetch reports for this week and last week
  const reports = await db
    .select()
    .from(weeklyReports)
    .where(inArray(weeklyReports.employeeId, empIds));

  const thisWeekReports = reports.filter((r) => r.weekKey === weekKey);
  const lastWeekReports = reports.filter((r) => r.weekKey === prevWeekKey);

  // Fetch entries for all relevant reports
  const allReportIds = [...thisWeekReports, ...lastWeekReports].map((r) => r.id);
  const allEntries = allReportIds.length > 0
    ? await db
        .select()
        .from(weeklyReportEntries)
        .where(inArray(weeklyReportEntries.reportId, allReportIds))
    : [];

  return empsWithMetrics.map((emp) => {
    const thisReport = thisWeekReports.find((r) => r.employeeId === emp.id);
    const lastReport = lastWeekReports.find((r) => r.employeeId === emp.id);

    const thisEntries = thisReport
      ? allEntries.filter((e) => e.reportId === thisReport.id)
      : [];
    const lastEntries = lastReport
      ? allEntries.filter((e) => e.reportId === lastReport.id)
      : [];

    const thisWeek: Record<number, number> = {};
    const lastWeek: Record<number, number> = {};
    for (const e of thisEntries) thisWeek[e.metricId] = e.value;
    for (const e of lastEntries) lastWeek[e.metricId] = e.value;

    return {
      employee: emp,
      metrics: emp.metrics,
      thisWeek,
      lastWeek,
      submitted: !!thisReport,
    };
  });
}

// ─── Goals ────────────────────────────────────────────────────────────────────



export async function getGoals(accountId: number, year?: number): Promise<Goal[]> {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(goals.accountId, accountId)];
  if (year !== undefined) conditions.push(eq(goals.year, year));
  return db
    .select()
    .from(goals)
    .where(and(...conditions))
    .orderBy(asc(goals.sortOrder), asc(goals.createdAt));
}

export async function createGoal(data: Omit<InsertGoal, "id" | "createdAt" | "updatedAt">): Promise<Goal> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(goals).values(data);
  const inserted = await db.select().from(goals).where(eq(goals.id, result.insertId));
  return inserted[0];
}

export async function updateGoal(id: number, data: Partial<Pick<Goal, "title" | "description" | "status" | "owner" | "sortOrder">>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(goals).set(data).where(eq(goals.id, id));
}

export async function deleteGoal(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(goals).where(eq(goals.id, id));
}

// ─── Person helpers ───────────────────────────────────────────────────────────
import { persons, kpiCategories, kpiEntries, type Person, type InsertPerson, type KpiCategory, type InsertKpiCategory, type KpiEntry, type InsertKpiEntry } from "../drizzle/schema";
import { nanoid } from "nanoid";

export async function getPersonByEmail(email: string): Promise<Person | null> {
  const db = await getDb();
  if (!db) return null;
  const [p] = await db.select().from(persons).where(eq(persons.email, email.toLowerCase())).limit(1);
  return p ?? null;
}

export async function getPersonById(id: string): Promise<Person | null> {
  const db = await getDb();
  if (!db) return null;
  const [p] = await db.select().from(persons).where(eq(persons.id, id)).limit(1);
  return p ?? null;
}

export async function getPersonByInviteToken(token: string): Promise<Person | null> {
  const db = await getDb();
  if (!db) return null;
  const [p] = await db.select().from(persons).where(eq(persons.inviteToken, token)).limit(1);
  return p ?? null;
}

export async function getPersonsByAccount(accountId: number): Promise<Person[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(persons).where(eq(persons.accountId, accountId)).orderBy(asc(persons.createdAt));
}

export async function createPerson(data: Omit<InsertPerson, "id" | "createdAt" | "updatedAt">): Promise<Person> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const id = nanoid(16);
  await db.insert(persons).values({ ...data, id, email: data.email.toLowerCase() });
  const p = await getPersonById(id);
  if (!p) throw new Error("Failed to create person");
  return p;
}

export async function updatePerson(id: string, data: Partial<Pick<Person, "name" | "passwordHash" | "inviteToken" | "inviteAccepted" | "businessScope" | "role" | "passwordResetToken" | "passwordResetExpiry">>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(persons).set(data).where(eq(persons.id, id));
}

export async function getPersonByResetToken(token: string): Promise<Person | null> {
  const db = await getDb();
  if (!db) return null;
  const [p] = await db.select().from(persons).where(eq(persons.passwordResetToken, token)).limit(1);
  return p ?? null;
}

export async function deletePerson(id: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(persons).where(eq(persons.id, id));
}

// ─── KPI Category helpers ─────────────────────────────────────────────────────

export async function getKpiCategories(accountId: number, businessSlug?: string): Promise<KpiCategory[]> {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(kpiCategories.accountId, accountId), eq(kpiCategories.isActive, true)];
  if (businessSlug) conditions.push(eq(kpiCategories.businessSlug, businessSlug));
  return db.select().from(kpiCategories).where(and(...conditions)).orderBy(asc(kpiCategories.sortOrder), asc(kpiCategories.id));
}

export async function createKpiCategory(data: Omit<InsertKpiCategory, "id" | "createdAt">): Promise<KpiCategory> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(kpiCategories).values(data);
  const [cat] = await db.select().from(kpiCategories).where(eq(kpiCategories.id, (result as any).insertId));
  return cat;
}

export async function updateKpiCategory(id: number, data: Partial<Pick<KpiCategory, "name" | "unit" | "frequency" | "sortOrder" | "isActive" | "monthlyTarget" | "showGoalToStaff">>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(kpiCategories).set(data).where(eq(kpiCategories.id, id));
}

// ─── KPI Entry helpers ────────────────────────────────────────────────────────

export async function upsertKpiEntry(data: Omit<InsertKpiEntry, "id" | "submittedAt" | "updatedAt">): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Check if entry exists for this person + category + period
  const [existing] = await db
    .select()
    .from(kpiEntries)
    .where(and(
      eq(kpiEntries.categoryId, data.categoryId),
      eq(kpiEntries.personId, data.personId),
      eq(kpiEntries.periodKey, data.periodKey),
    ))
    .limit(1);
  if (existing) {
    await db.update(kpiEntries).set({ value: data.value }).where(eq(kpiEntries.id, existing.id));
  } else {
    await db.insert(kpiEntries).values(data);
  }
}

export async function getKpiEntries(accountId: number, businessSlug: string, periodKey: string): Promise<KpiEntry[]> {
  const db = await getDb();
  if (!db) return [];
  // Get all category IDs for this business
  const cats = await getKpiCategories(accountId, businessSlug);
  if (cats.length === 0) return [];
  const catIds = cats.map(c => c.id);
  return db
    .select()
    .from(kpiEntries)
    .where(and(
      eq(kpiEntries.accountId, accountId),
      eq(kpiEntries.periodKey, periodKey),
      inArray(kpiEntries.categoryId, catIds),
    ));
}

export async function getKpiMonthlyTotals(accountId: number, businessSlug: string, yearMonth: string): Promise<{ categoryId: number; categoryName: string; unit: string; personId: string; total: number }[]> {
  const db = await getDb();
  if (!db) return [];
  // Get all weekly entries for the month (periodKey starts with yearMonth for weekly, or equals for monthly)
  const cats = await getKpiCategories(accountId, businessSlug);
  if (cats.length === 0) return [];
  const catIds = cats.map(c => c.id);
  const catMap: Record<number, { name: string; unit: string; monthlyTarget: number | null; showGoalToStaff: boolean }> = {};
  for (const c of cats) catMap[c.id] = { name: c.name, unit: c.unit, monthlyTarget: c.monthlyTarget ?? null, showGoalToStaff: c.showGoalToStaff ?? false };
  const allEntries = await db
    .select()
    .from(kpiEntries)
    .where(and(
      eq(kpiEntries.accountId, accountId),
      inArray(kpiEntries.categoryId, catIds),
    ));
  // Filter by month: weekly entries have periodKey "YYYY-Www", monthly have "YYYY-MM"
  const monthEntries = allEntries.filter(e => {
    if (e.periodKey.startsWith(yearMonth)) return true; // monthly exact match
    // For weekly: check if the week falls in the month
    if (e.periodKey.match(/^\d{4}-W\d{2}$/)) {
      // Parse the week start date
      const [year, week] = e.periodKey.split("-W").map(Number);
      const jan4 = new Date(year, 0, 4);
      const weekStart = new Date(jan4.getTime() + (week - 1) * 7 * 86400000);
      const monthStr = `${year}-${String(weekStart.getMonth() + 1).padStart(2, "0")}`;
      return monthStr === yearMonth;
    }
    return false;
  });
  // Sum by (categoryId, personId)
  const totals: Record<string, number> = {};
  for (const e of monthEntries) {
    const key = `${e.categoryId}::${e.personId}`;
    totals[key] = (totals[key] ?? 0) + e.value;
  }
  return Object.entries(totals).map(([key, total]) => {
    const [catIdStr, personId] = key.split("::");
    const catId = Number(catIdStr);
    return {
      categoryId: catId,
      categoryName: catMap[catId]?.name ?? String(catId),
      unit: catMap[catId]?.unit ?? "#",
      monthlyTarget: catMap[catId]?.monthlyTarget ?? null,
      showGoalToStaff: catMap[catId]?.showGoalToStaff ?? false,
      personId,
      total,
    };
  });
}

// ─── Business helpers ─────────────────────────────────────────────────────────
import { businesses, reportQuestions, reportAnswers, type Business, type InsertBusiness, type ReportQuestion, type InsertReportQuestion, type ReportAnswer, type InsertReportAnswer } from "../drizzle/schema";

export async function getBusinessesByAccount(accountId: number): Promise<Business[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(businesses)
    .where(and(eq(businesses.accountId, accountId), eq(businesses.isActive, true)))
    .orderBy(asc(businesses.sortOrder), asc(businesses.id));
}

export async function createBusiness(data: Omit<InsertBusiness, "id" | "createdAt" | "updatedAt">): Promise<Business> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(businesses).values(data);
  const [biz] = await db.select().from(businesses).where(eq(businesses.id, (result as any).insertId));
  return biz;
}

export async function updateBusiness(id: number, data: Partial<Pick<Business, "name" | "slug" | "icon" | "color" | "logoUrl" | "sortOrder" | "isActive">>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(businesses).set(data).where(eq(businesses.id, id));
}

// ─── Report Question helpers ──────────────────────────────────────────────────

export async function getReportQuestions(accountId: number, businessId?: number): Promise<ReportQuestion[]> {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(reportQuestions.accountId, accountId), eq(reportQuestions.isActive, true)];
  if (businessId !== undefined) {
    // Return questions for this business OR questions that apply to all (businessId=0)
    conditions.push(
      // We use a raw OR: businessId = 0 OR businessId = input
      // Drizzle doesn't have a clean OR in where array, so we filter in JS
    );
  }
  const rows = await db.select().from(reportQuestions)
    .where(and(...conditions))
    .orderBy(asc(reportQuestions.sortOrder), asc(reportQuestions.id));
  if (businessId !== undefined && businessId !== 0) {
    return rows.filter(q => q.businessId === 0 || q.businessId === businessId);
  }
  return rows;
}

export async function createReportQuestion(data: Omit<InsertReportQuestion, "id" | "createdAt">): Promise<ReportQuestion> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(reportQuestions).values(data);
  const [q] = await db.select().from(reportQuestions).where(eq(reportQuestions.id, (result as any).insertId));
  return q;
}

export async function deleteReportQuestion(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(reportQuestions).set({ isActive: false }).where(eq(reportQuestions.id, id));
}

// ─── Report Answer helpers ────────────────────────────────────────────────────

export async function upsertReportAnswer(data: Omit<InsertReportAnswer, "id" | "submittedAt" | "updatedAt">): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [existing] = await db.select().from(reportAnswers)
    .where(and(
      eq(reportAnswers.questionId, data.questionId),
      eq(reportAnswers.personId, data.personId),
      eq(reportAnswers.weekKey, data.weekKey),
    )).limit(1);
  if (existing) {
    await db.update(reportAnswers).set({ answer: data.answer }).where(eq(reportAnswers.id, existing.id));
  } else {
    await db.insert(reportAnswers).values(data);
  }
}

export async function getReportAnswers(accountId: number, weekKey: string): Promise<(ReportAnswer & { questionText: string })[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(reportAnswers)
    .where(and(eq(reportAnswers.accountId, accountId), eq(reportAnswers.weekKey, weekKey)));
  const qIds = Array.from(new Set(rows.map(r => r.questionId)));
  if (qIds.length === 0) return [];
  const qRows = await db.select().from(reportQuestions).where(inArray(reportQuestions.id, qIds));
  const qMap: Record<number, string> = {};
  for (const q of qRows) qMap[q.id] = q.question;
  return rows.map(r => ({ ...r, questionText: qMap[r.questionId] ?? String(r.questionId) }));
}

// ─── Notification helpers ─────────────────────────────────────────────────────

/** Create a new in-app notification for a specific person. */
export async function createNotification(data: {
  accountId: number;
  recipientPersonId: string;
  type: Notification["type"];
  title: string;
  body: string;
  linkTo?: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(notifications).values({
    accountId: data.accountId,
    recipientPersonId: data.recipientPersonId,
    type: data.type,
    title: data.title,
    body: data.body,
    linkTo: data.linkTo ?? "/app/board",
  });
}

/** Get the most recent 50 notifications for a person, newest first. */
export async function getNotificationsForPerson(
  accountId: number,
  recipientPersonId: string
): Promise<Notification[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(notifications)
    .where(
      and(
        eq(notifications.accountId, accountId),
        eq(notifications.recipientPersonId, recipientPersonId)
      )
    )
    .orderBy(desc(notifications.createdAt))
    .limit(50);
}

/** Count unread notifications for a person. */
export async function countUnreadNotifications(
  accountId: number,
  recipientPersonId: string
): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const rows = await db
    .select()
    .from(notifications)
    .where(
      and(
        eq(notifications.accountId, accountId),
        eq(notifications.recipientPersonId, recipientPersonId),
        eq(notifications.isRead, false)
      )
    );
  return rows.length;
}

/** Mark a single notification as read. */
export async function markNotificationRead(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
}

/** Mark all notifications as read for a person. */
export async function markAllNotificationsRead(
  accountId: number,
  recipientPersonId: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(
      and(
        eq(notifications.accountId, accountId),
        eq(notifications.recipientPersonId, recipientPersonId),
        eq(notifications.isRead, false)
      )
    );
}

// ─── Business Hours helpers ─────────────────────────────────────────────────

const DEFAULT_WORK_DAYS = "[1,2,3,4,5]";
const DEFAULT_START_TIME = "08:00";
const DEFAULT_END_TIME = "18:00";
const DEFAULT_TIMEZONE = "America/New_York";

/** Get (or lazily create) the business hours row for an account. */
export async function getBusinessHours(accountId: number): Promise<BusinessHours> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const rows = await db.select().from(businessHours).where(eq(businessHours.accountId, accountId)).limit(1);
  if (rows.length > 0) return rows[0];
  // Create default row
  await db.insert(businessHours).values({
    accountId,
    workDays: DEFAULT_WORK_DAYS,
    startTime: DEFAULT_START_TIME,
    endTime: DEFAULT_END_TIME,
    timezone: DEFAULT_TIMEZONE,
    manualDndActive: false,
  });
  const created = await db.select().from(businessHours).where(eq(businessHours.accountId, accountId)).limit(1);
  return created[0];
}

/** Update business hours settings for an account. */
export async function updateBusinessHours(
  accountId: number,
  data: { workDays?: string; startTime?: string; endTime?: string; timezone?: string }
): Promise<BusinessHours> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  // Ensure row exists
  await getBusinessHours(accountId);
  await db.update(businessHours).set(data).where(eq(businessHours.accountId, accountId));
  return getBusinessHours(accountId);
}

/** Toggle the manual DND flag for an account. Returns the new state. */
export async function toggleDnd(accountId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const row = await getBusinessHours(accountId);
  const newState = !row.manualDndActive;
  await db.update(businessHours).set({ manualDndActive: newState }).where(eq(businessHours.accountId, accountId));
  return newState;
}

/** Set DND to a specific value. */
export async function setDnd(accountId: number, active: boolean): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await getBusinessHours(accountId);
  await db.update(businessHours).set({ manualDndActive: active }).where(eq(businessHours.accountId, accountId));
  return active;
}

// ─── Subscription helpers ────────────────────────────────────────────────────

/** Get the subscription row for an account (or null if none exists). */
export async function getSubscription(accountId: number): Promise<Subscription | null> {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db.select().from(subscriptions).where(eq(subscriptions.accountId, accountId)).limit(1);
  return row ?? null;
}

/** Create or update the subscription row for an account. */
export async function upsertSubscription(data: InsertSubscription): Promise<Subscription> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(subscriptions).values(data).onDuplicateKeyUpdate({
    set: {
      ownerPersonId: data.ownerPersonId,
      revenueCatUserId: data.revenueCatUserId ?? null,
      revenueCatProductId: data.revenueCatProductId ?? null,
      plan: data.plan,
      status: data.status,
      trialEndsAt: data.trialEndsAt ?? null,
      currentPeriodEndsAt: data.currentPeriodEndsAt ?? null,
      revenueCatData: data.revenueCatData ?? null,
    },
  });
  const [row] = await db.select().from(subscriptions).where(eq(subscriptions.accountId, data.accountId)).limit(1);
  return row!;
}

/** Start a 14-day free trial for an account. No-op if subscription already exists. */
export async function startTrial(accountId: number, ownerPersonId: string): Promise<Subscription> {
  const existing = await getSubscription(accountId);
  if (existing) return existing;
  const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  return upsertSubscription({
    accountId,
    ownerPersonId,
    plan: "core",
    status: "trialing",
    trialEndsAt,
    currentPeriodEndsAt: trialEndsAt,
  });
}

/**
 * Check whether an account has active access.
 * Returns { hasAccess, reason } where reason is one of:
 *   "active" | "trialing" | "partner" | "no_subscription" | "trial_expired" | "lapsed"
 */
export async function checkSubscriptionAccess(
  accountId: number,
  personId: string,
): Promise<{ hasAccess: boolean; reason: string; plan: string | null; trialDaysLeft: number | null }> {
  const db = await getDb();
  if (!db) return { hasAccess: false, reason: "db_unavailable", plan: null, trialDaysLeft: null };

  // Check if this person is a linked partner — if so, access is derived from owner's subscription
  const [partnerRow] = await db.select().from(partnerLinks).where(eq(partnerLinks.partnerPersonId, personId)).limit(1);
  if (partnerRow) {
    // Partner's access is tied to the owner's subscription
    const ownerSub = await getSubscription(partnerRow.accountId);
    if (!ownerSub) return { hasAccess: false, reason: "no_subscription", plan: null, trialDaysLeft: null };
    const now = new Date();
    if (ownerSub.status === "trialing") {
      if (ownerSub.trialEndsAt && ownerSub.trialEndsAt > now) {
        const daysLeft = Math.ceil((ownerSub.trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return { hasAccess: true, reason: "partner_trialing", plan: ownerSub.plan, trialDaysLeft: daysLeft };
      }
      return { hasAccess: false, reason: "trial_expired", plan: ownerSub.plan, trialDaysLeft: 0 };
    }
    if (ownerSub.status === "active" || ownerSub.status === "cancelled") {
      const stillActive = !ownerSub.currentPeriodEndsAt || ownerSub.currentPeriodEndsAt > now;
      return { hasAccess: stillActive, reason: stillActive ? "partner_active" : "lapsed", plan: ownerSub.plan, trialDaysLeft: null };
    }
    return { hasAccess: false, reason: "lapsed", plan: ownerSub.plan, trialDaysLeft: null };
  }

  // Not a partner — check the account's own subscription
  const sub = await getSubscription(accountId);
  if (!sub) return { hasAccess: false, reason: "no_subscription", plan: null, trialDaysLeft: null };

  const now = new Date();
  if (sub.status === "trialing") {
    if (sub.trialEndsAt && sub.trialEndsAt > now) {
      const daysLeft = Math.ceil((sub.trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return { hasAccess: true, reason: "trialing", plan: sub.plan, trialDaysLeft: daysLeft };
    }
    return { hasAccess: false, reason: "trial_expired", plan: sub.plan, trialDaysLeft: 0 };
  }
  if (sub.status === "active" || sub.status === "cancelled") {
    const stillActive = !sub.currentPeriodEndsAt || sub.currentPeriodEndsAt > now;
    return { hasAccess: stillActive, reason: stillActive ? "active" : "lapsed", plan: sub.plan, trialDaysLeft: null };
  }
  return { hasAccess: false, reason: "lapsed", plan: sub.plan, trialDaysLeft: null };
}

// ─── Partner link helpers ─────────────────────────────────────────────────────

/** Get the partner link for a partner person (if any). */
export async function getPartnerLink(partnerPersonId: string): Promise<PartnerLink | null> {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db.select().from(partnerLinks).where(eq(partnerLinks.partnerPersonId, partnerPersonId)).limit(1);
  return row ?? null;
}

/** Create a partner link between an owner and their co-owner. */
export async function createPartnerLink(accountId: number, ownerPersonId: string, partnerPersonId: string): Promise<PartnerLink> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  // Upsert: if partner already linked, update owner reference
  await db.insert(partnerLinks).values({ accountId, ownerPersonId, partnerPersonId }).onDuplicateKeyUpdate({
    set: { ownerPersonId, accountId },
  });
  const [row] = await db.select().from(partnerLinks).where(eq(partnerLinks.partnerPersonId, partnerPersonId)).limit(1);
  return row!;
}

// ─── Owner Messages helpers ───────────────────────────────────────────────────

/** Get co-owner messages for an account (most recent first). */
export async function getOwnerMessages(accountId: number, limit = 50): Promise<OwnerMessage[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(ownerMessages)
    .where(eq(ownerMessages.accountId, accountId))
    .orderBy(asc(ownerMessages.createdAt))
    .limit(limit);
}

/** Send a message from one owner to another. */
export async function sendOwnerMessage(data: {
  accountId: number;
  fromPersonId: string;
  toPersonId: string;
  body: string;
}): Promise<OwnerMessage> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(ownerMessages).values(data);
  const rows = await db.select().from(ownerMessages)
    .where(eq(ownerMessages.accountId, data.accountId))
    .orderBy(desc(ownerMessages.createdAt))
    .limit(1);
  return rows[0]!;
}

// ─── Announcements helpers ────────────────────────────────────────────────────

/** Get announcements for a person (either sent to them specifically or to all employees). */
export async function getAnnouncements(accountId: number, personId: string, limit = 30): Promise<Announcement[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(announcements)
    .where(eq(announcements.accountId, accountId))
    .orderBy(desc(announcements.createdAt))
    .limit(limit);
  // Filter: include if toPersonId is null (all employees) or matches this person
  return rows.filter(r => r.toPersonId === null || r.toPersonId === personId);
}

/** Get all announcements for an account (owner view). */
export async function getAllAnnouncements(accountId: number, limit = 50): Promise<Announcement[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(announcements)
    .where(eq(announcements.accountId, accountId))
    .orderBy(desc(announcements.createdAt))
    .limit(limit);
}

/** Send an announcement from an owner to an employee or all employees. */
export async function sendAnnouncement(data: {
  accountId: number;
  fromPersonId: string;
  toPersonId: string | null;
  body: string;
}): Promise<Announcement> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(announcements).values(data);
  const rows = await db.select().from(announcements)
    .where(eq(announcements.accountId, data.accountId))
    .orderBy(desc(announcements.createdAt))
    .limit(1);
  return rows[0]!;
}
