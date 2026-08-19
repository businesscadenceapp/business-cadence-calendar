import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const swipeOnboarding = readFileSync(resolve(root, "client/src/pages/SwipeOnboarding.tsx"), "utf8");
const board = readFileSync(resolve(root, "client/src/pages/Board.tsx"), "utf8");

describe("new owner setup completion", () => {
  it("clears the deferred-profile flag after creating the owner’s first business", () => {
    expect(swipeOnboarding).toContain('localStorage.removeItem("bcc_profile_deferred_" + accountId)');
    expect(swipeOnboarding).not.toContain('localStorage.setItem("bcc_profile_deferred_" + accountId, "1")');
  });

  it("does not show a stale Finish Setup prompt after entering Command Center", () => {
    expect(board).toContain('localStorage.removeItem("bcc_profile_deferred_" + accountId)');
    expect(board).toContain("setProfileDeferred(false)");
  });
});
