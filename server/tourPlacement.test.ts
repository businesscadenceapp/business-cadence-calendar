import { describe, expect, it } from "vitest";
import { getTourCardLayout, getTourCardPlacement } from "../client/src/lib/tour-placement";

const compactPhoneHeight = 852;

describe("hub-aware tour card placement", () => {
  it("places an upper hub circle below its spotlight", () => {
    expect(getTourCardPlacement({ y: 185, height: 110 }, compactPhoneHeight, "tour-hub-tasks")).toBe("below");
  });

  it("places a lower hub circle above its spotlight", () => {
    expect(getTourCardPlacement({ y: 570, height: 110 }, compactPhoneHeight, "tour-hub-issues")).toBe("above");
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
});
