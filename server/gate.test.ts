import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

describe("gate.verify", () => {
  const originalPassword = process.env.SITE_PASSWORD;

  beforeAll(() => {
    process.env.SITE_PASSWORD = "testpassword123";
  });

  afterAll(() => {
    process.env.SITE_PASSWORD = originalPassword;
  });

  it("returns success: true for the correct password", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.gate.verify({ password: "testpassword123" });
    expect(result.success).toBe(true);
  });

  it("returns success: false for an incorrect password", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.gate.verify({ password: "wrongpassword" });
    expect(result.success).toBe(false);
  });

  it("returns success: false for an empty password", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.gate.verify({ password: "" });
    expect(result.success).toBe(false);
  });
});
