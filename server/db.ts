import { eq, and, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, meetingLogs, agendaItems, MeetingLog, AgendaItem, boardCards, agendaTemplates, type BoardCard, type InsertBoardCard, waitlistEmails, meetingRecordings, type MeetingRecording } from "../drizzle/schema";
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

// ─── Command Board helpers ────────────────────────────────────────────────────

export async function getBoardCards(includeArchived = false): Promise<BoardCard[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(boardCards).orderBy(boardCards.createdAt);
  if (includeArchived) return rows;
  return rows.filter(r => r.archivedAt === null);
}

export async function createBoardCard(
  data: Pick<InsertBoardCard, "author" | "type" | "business" | "content">
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

export async function markCardSeen(id: number, seenBy: "Matt" | "Lynn"): Promise<void> {
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
  business: "chiropractic" | "crossfit" | "realty",
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
  business: "chiropractic" | "crossfit" | "realty",
  meetingType: "daily" | "weekly" | "monthly" | "quarterly",
  items: AgendaTemplateItem[],
  updatedBy: "Matt" | "Lynn"
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

// ─── Meeting Recording helpers ────────────────────────────────────────────────

/** Create a new recording row in pending state. Returns the new row id. */
export async function createMeetingRecording(meetingLogId: number, audioKey: string): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(meetingRecordings).values({ meetingLogId, audioKey, processingStatus: "processing" });
  return (result as any)[0]?.insertId ?? null;
}

/** Update a recording row with transcript + AI notes after processing. */
export async function updateMeetingRecording(
  id: number,
  data: { transcript?: string; aiNotes?: string; processingStatus: "done" | "error"; errorMessage?: string }
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(meetingRecordings).set(data).where(eq(meetingRecordings.id, id));
}

/** Get the most recent recording for a meeting log. */
export async function getMeetingRecording(meetingLogId: number): Promise<MeetingRecording | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(meetingRecordings)
    .where(eq(meetingRecordings.meetingLogId, meetingLogId))
    .orderBy(desc(meetingRecordings.createdAt))
    .limit(1);
  return rows[0] ?? null;
}
