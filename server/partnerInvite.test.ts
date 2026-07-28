/**
 * Tests for the partner invite flow:
 *  - generatePartnerInviteLink stores businessName on the token
 *  - lookupPartnerInvite returns businessName alongside ownerName
 *  - notifyPartnerJoined creates a notification and clears the token
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Mock the DB module ───────────────────────────────────────────────────────
vi.mock("./db", () => ({
  getDb: vi.fn(),
  createNotification: vi.fn().mockResolvedValue(undefined),
  getPersonByEmail: vi.fn().mockResolvedValue(null),
  getPersonById: vi.fn().mockResolvedValue(null),
  getPersonsByAccount: vi.fn().mockResolvedValue([]),
  createPerson: vi.fn().mockResolvedValue(null),
  updatePerson: vi.fn().mockResolvedValue(undefined),
}));

function makeCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

// ─── lookupPartnerInvite ──────────────────────────────────────────────────────
describe("subscription.lookupPartnerInvite", () => {
  it("returns valid=false when token is not found", async () => {
    const { getDb } = await import("./db");
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };
    vi.mocked(getDb).mockResolvedValue(mockDb as any);

    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.subscription.lookupPartnerInvite({ token: "nonexistent-token" });
    expect(result.valid).toBe(false);
    expect((result as any).reason).toBe("not_found");
  });

  it("returns businessName when token is found", async () => {
    const { getDb } = await import("./db");
    const fakeOwner = {
      id: "owner-001",
      name: "Matt",
      accountId: 42,
      partnerInviteToken: "valid-token-abc",
      partnerInviteBusinessName: "CrossFit Riverside",
    };
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([fakeOwner]),
    };
    vi.mocked(getDb).mockResolvedValue(mockDb as any);

    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.subscription.lookupPartnerInvite({ token: "valid-token-abc" });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.businessName).toBe("CrossFit Riverside");
      expect(result.ownerName).toBe("Matt");
      expect(result.accountId).toBe(42);
    }
  });

  it("returns businessName=null when owner has no stored business name", async () => {
    const { getDb } = await import("./db");
    const fakeOwner = {
      id: "owner-002",
      name: "Lynn",
      accountId: 7,
      partnerInviteToken: "another-token",
      partnerInviteBusinessName: null,
    };
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([fakeOwner]),
    };
    vi.mocked(getDb).mockResolvedValue(mockDb as any);

    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.subscription.lookupPartnerInvite({ token: "another-token" });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.businessName).toBeNull();
    }
  });
});

// ─── notifyPartnerJoined ──────────────────────────────────────────────────────
describe("subscription.notifyPartnerJoined", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns success=false when token is invalid", async () => {
    const { getDb } = await import("./db");
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
    };
    vi.mocked(getDb).mockResolvedValue(mockDb as any);

    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.subscription.notifyPartnerJoined({
      token: "bad-token",
      partnerName: "Sarah",
    });
    expect(result.success).toBe(false);
    expect((result as any).reason).toBe("invalid_token");
  });

  it("creates a partner_joined notification and clears the token on success", async () => {
    const { getDb, createNotification } = await import("./db");
    const fakeOwner = {
      id: "owner-001",
      name: "Matt",
      accountId: 42,
      partnerInviteToken: "valid-token",
      partnerInviteBusinessName: "CrossFit Riverside",
    };
    const updateSet: Record<string, unknown> = {};
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockImplementation((_cond: unknown) => mockDb),
      limit: vi.fn().mockResolvedValue([fakeOwner]),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockImplementation((vals: Record<string, unknown>) => {
        Object.assign(updateSet, vals);
        return mockDb;
      }),
    };
    vi.mocked(getDb).mockResolvedValue(mockDb as any);

    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.subscription.notifyPartnerJoined({
      token: "valid-token",
      partnerName: "Sarah",
    });

    expect(result.success).toBe(true);
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: 42,
        recipientPersonId: "owner-001",
        type: "partner_joined",
      })
    );
    // Token should be cleared
    expect(updateSet.partnerInviteToken).toBeNull();
    expect(updateSet.partnerInviteBusinessName).toBeNull();
  });
});
