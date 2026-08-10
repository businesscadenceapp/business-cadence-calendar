import { describe, expect, it } from "vitest";
import { getTourCardLayout, getTourCardPlacement } from "../client/src/lib/tour-placement";

const compactPhoneHeight = 852;

describe("hub-aware tour card placement", () => {
  it("places every named upper Command Center circle below its spotlight", () => {
    for (const id of ["tour-hub-tasks", "tour-hub-archive", "tour-hub-updates"]) {
      expect(getTourCardPlacement({ y: 185, height: 110 }, compactPhoneHeight, id)).toBe("below");
    }
  });

  it("places every named lower Command Center circle above its spotlight", () => {
    for (const id of ["tour-hub-calendar", "tour-hub-issues", "tour-hub-needs-attention"]) {
      expect(getTourCardPlacement({ y: 570, height: 110 }, compactPhoneHeight, id)).toBe("above");
    }
  });

  it("keeps the Swipe Left cue visible by anchoring its card above the cue", () => {
    const layout = getTourCardLayout({ y: 676, height: 20 }, compactPhoneHeight, "tour-hub-swipe");

    expect(layout.placement).toBe("above");
    expect(layout.anchorOffset).toBeGreaterThan(0);
    expect(layout.maxHeight).toBeGreaterThanOrEqual(168);
  });

  it("uses the opposite available side when the preferred side cannot fit", () => {
    expect(getTourCardPlacement({ y: 610, height: 130 }, compactPhoneHeight, "tour-hub-calendar")).toBe("above");
  });

  it("retains room for the fixed action row on normal compact-phone placements", () => {
    const layout = getTourCardLayout({ y: 570, height: 110 }, compactPhoneHeight, "tour-hub-issues");

    expect(layout.maxHeight).toBeGreaterThanOrEqual(168);
  });
});
