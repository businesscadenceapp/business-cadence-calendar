import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock the db module so tests don't need a real database
vi.mock("./db", () => ({
  getMeetingLog: vi.fn(),
  upsertMeetingLog: vi.fn(),
  saveSummary: vi.fn(),
  getAgendaItems: vi.fn(),
  toggleAgendaItem: vi.fn(),
}));

// Mock the LLM module
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(),
}));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";
import * as llm from "./_core/llm";

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("meetingLog.get", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns null log and empty items when no log exists", async () => {
    vi.mocked(db.getMeetingLog).mockResolvedValue(undefined);
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.meetingLog.get({ dateKey: "2026-01-06", meetingType: "weekly" });
    expect(result.log).toBeNull();
    expect(result.agendaItems).toEqual([]);
  });

  it("returns log and agenda items when log exists", async () => {
    const mockLog = {
      id: 1,
      dateKey: "2026-01-06",
      meetingType: "weekly" as const,
      notes: "Great meeting",
      aiSummary: null,
      summaryGeneratedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const mockItems = [
      { id: 1, meetingLogId: 1, itemKey: "weekly-chiro-0", completed: true, createdAt: new Date(), updatedAt: new Date() },
    ];
    vi.mocked(db.getMeetingLog).mockResolvedValue(mockLog);
    vi.mocked(db.getAgendaItems).mockResolvedValue(mockItems);
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.meetingLog.get({ dateKey: "2026-01-06", meetingType: "weekly" });
    expect(result.log).toEqual(mockLog);
    expect(result.agendaItems).toHaveLength(1);
    expect(result.agendaItems[0].completed).toBe(true);
  });
});

describe("meetingLog.saveNotes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls upsertMeetingLog with correct args and returns the log", async () => {
    const mockLog = {
      id: 2,
      dateKey: "2026-01-06",
      meetingType: "daily" as const,
      notes: "Patient count: 12",
      aiSummary: null,
      summaryGeneratedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    vi.mocked(db.upsertMeetingLog).mockResolvedValue(mockLog);
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.meetingLog.saveNotes({
      dateKey: "2026-01-06",
      meetingType: "daily",
      notes: "Patient count: 12",
    });
    expect(db.upsertMeetingLog).toHaveBeenCalledWith("2026-01-06", "daily", "Patient count: 12");
    expect(result.log.notes).toBe("Patient count: 12");
  });
});

describe("meetingLog.toggleItem", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a log if none exists, then toggles the item", async () => {
    vi.mocked(db.getMeetingLog).mockResolvedValueOnce(undefined);
    const mockLog = {
      id: 3,
      dateKey: "2026-01-06",
      meetingType: "weekly" as const,
      notes: "",
      aiSummary: null,
      summaryGeneratedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    vi.mocked(db.upsertMeetingLog).mockResolvedValue(mockLog);
    vi.mocked(db.toggleAgendaItem).mockResolvedValue(undefined);
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.meetingLog.toggleItem({
      dateKey: "2026-01-06",
      meetingType: "weekly",
      itemKey: "weekly-chiro-0",
      completed: true,
    });
    expect(db.upsertMeetingLog).toHaveBeenCalledWith("2026-01-06", "weekly", "");
    expect(db.toggleAgendaItem).toHaveBeenCalledWith(3, "weekly-chiro-0", true, undefined);
    expect(result.success).toBe(true);
  });
});

describe("meetingLog.generateSummary", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls LLM and saves the summary", async () => {
    vi.mocked(llm.invokeLLM).mockResolvedValue({
      choices: [{ message: { content: "Great meeting. All chiropractic items completed." } }],
    } as any);
    vi.mocked(db.saveSummary).mockResolvedValue(undefined);
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.meetingLog.generateSummary({
      dateKey: "2026-01-06",
      meetingType: "weekly",
      notes: "Discussed patient retention",
      items: [
        { label: "Chiropractic: Scorecard review", completed: true, comment: "All metrics green" },
        { label: "CrossFit: Member count", completed: false },
      ],
      businessContext: "Weekly Level 10",
    });
    expect(llm.invokeLLM).toHaveBeenCalled();
    expect(db.saveSummary).toHaveBeenCalledWith("2026-01-06", "weekly", "Great meeting. All chiropractic items completed.");
    expect(result.summary).toBe("Great meeting. All chiropractic items completed.");
  });
});
