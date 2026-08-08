import { describe, expect, it } from "vitest";
import {
  COMMAND_HUB_DESTINATIONS,
  PERFORMANCE_HUB_DESTINATIONS,
  modeFromDndState,
  hubIsInteractive,
  IMMERSIVE_HUB_TOUCH_TARGETS,
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

  it("shuts down destination activation while owners are off the clock", () => {
    expect(hubIsInteractive("sun")).toBe(true);
    expect(hubIsInteractive("moon")).toBe(false);
  });

  it("keeps invisible iPhone touch targets forgiving without changing visual geometry", () => {
    expect(IMMERSIVE_HUB_TOUCH_TARGETS.appBubblePercent).toBeGreaterThanOrEqual(24);
    expect(IMMERSIVE_HUB_TOUCH_TARGETS.centerPercent).toBeGreaterThanOrEqual(38);
    expect(IMMERSIVE_HUB_TOUCH_TARGETS.centerTopPercent).toBe(50);
  });
});
