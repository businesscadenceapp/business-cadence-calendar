import { describe, it, expect } from "vitest";

describe("Resend API key", () => {
  it("RESEND_API_KEY env var is set", () => {
    const key = process.env.RESEND_API_KEY;
    expect(key).toBeDefined();
    expect(key?.startsWith("re_")).toBe(true);
  });
});
