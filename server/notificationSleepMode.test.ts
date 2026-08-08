import { describe, expect, it } from "vitest";

/** Mirrors the Board control intent: circles remain available in either state,
 * while only the notification preference changes. */
export function notificationModeAction(currentlyPaused: boolean, shouldPause: boolean) {
  return currentlyPaused === shouldPause ? "noop" : "toggle";
}

describe("hub notification sleep controls", () => {
  it("turns sleep mode on from the compact moon control", () => {
    expect(notificationModeAction(false, true)).toBe("toggle");
  });

  it("turns notifications back on from the compact sun control", () => {
    expect(notificationModeAction(true, false)).toBe("toggle");
  });

  it("does not block navigation just because notification sleep is already enabled", () => {
    expect(notificationModeAction(true, true)).toBe("noop");
  });
});
