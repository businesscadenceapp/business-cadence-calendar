import { describe, expect, it } from "vitest";
import {
  COMMAND_HUB_DESTINATIONS,
  PERFORMANCE_HUB_DESTINATIONS,
  modeFromDndState,
  orbitVelocityForMode,
} from "../client/src/components/ImageHub";

describe("premium image hub configuration", () => {
  it("preserves every command-center destination", () => {
    expect(COMMAND_HUB_DESTINATIONS).toEqual([
      "tasks",
      "updates",
      "issues",
      "needs_attention",
      "calendar",
      "archive",
    ]);
  });

  it("preserves every performance-hub destination", () => {
    expect(PERFORMANCE_HUB_DESTINATIONS).toEqual([
      "/app/goals",
      "/app/messages",
      "/app/kpi",
      "/app/reports",
      "refer",
      "/app/settings",
    ]);
  });

  it("maps the existing off-the-clock state to the shared moon treatment", () => {
    expect(modeFromDndState(false)).toBe("sun");
    expect(modeFromDndState(true)).toBe("moon");
  });

  it("uses a slower orbital speed while owners are off the clock", () => {
    expect(orbitVelocityForMode("sun")).toBeGreaterThan(orbitVelocityForMode("moon"));
  });
});
