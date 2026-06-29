import { eq, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, meetingLogs, agendaItems, MeetingLog, AgendaItem } from "../drizzle/schema";
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
  completed: boolean
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select().from(agendaItems)
    .where(and(eq(agendaItems.meetingLogId, meetingLogId), eq(agendaItems.itemKey, itemKey)))
    .limit(1);
  if (existing.length > 0) {
    await db.update(agendaItems)
      .set({ completed, updatedAt: new Date() })
      .where(eq(agendaItems.id, existing[0].id));
  } else {
    await db.insert(agendaItems).values({ meetingLogId, itemKey, completed });
  }
}
