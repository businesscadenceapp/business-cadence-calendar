import { describe, expect, it } from "vitest";
import { getUnloggedOwnerMeetings, shouldShowCadenceCheckIn } from "../shared/calendarAccountability";

const meeting = (date: string, meetingType: "daily" | "weekly" | "monthly" | "quarterly") => ({ date, meetingType, layer: "owner" as const, isRescheduled: false });

describe("Calendar Accountability", () => {
  it("raises the cadence check-in after three unlogged owner meetings", () => {
    const unlogged = getUnloggedOwnerMeetings([
      meeting("2026-08-01", "daily"),
      meeting("2026-08-03", "weekly"),
      meeting("2026-08-07", "daily"),
    ], new Map(), "2026-08-10");
    expect(unlogged).toHaveLength(3);
    expect(shouldShowCadenceCheckIn(unlogged.length)).toBe(true);
  });

  it("does not count held or rescheduled meetings as unlogged", () => {
    const unlogged = getUnloggedOwnerMeetings([
      meeting("2026-08-01", "daily"),
      meeting("2026-08-03", "weekly"),
      meeting("2026-08-07", "daily"),
    ], new Map([
      ["2026-08-01:daily", "held"],
      ["2026-08-03:weekly", "rescheduled"],
    ]), "2026-08-10");
    expect(unlogged.map((item) => item.date)).toEqual(["2026-08-07"]);
  });
});
