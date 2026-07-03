import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the database module so tests don't need a real DB connection
vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    getDb: vi.fn().mockResolvedValue(null), // DB not available → gate returns false
  };
});

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

describe("gate.verify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns success: false when DB is unavailable", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.gate.verify({ username: "owner", password: "lynnandmatt901" });
    expect(result.success).toBe(false);
  });

  it("returns success: false for missing username", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    // Passing empty string is valid input — just won't match any user
    const result = await caller.gate.verify({ username: "", password: "anypassword" });
    expect(result.success).toBe(false);
  });

  it("returns success: false for missing password", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.gate.verify({ username: "owner", password: "" });
    expect(result.success).toBe(false);
  });
});
