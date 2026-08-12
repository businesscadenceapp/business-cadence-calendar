import { describe, expect, it } from "vitest";
import { getPersonNotificationStatus } from "./db";
import type { PersonHours } from "../drizzle/schema";

function settings(overrides: Partial<PersonHours> = {}): PersonHours {
  return {
    id: 1,
    accountId: 1,
    personId: "partner-1",
    workDays: "[1,2,3,4,5]",
    startTime: "09:00",
    endTime: "17:00",
    timezone: "America/New_York",
    manualDndActive: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("personal Sleep Mode notification delivery", () => {
  it("holds notifications when a partner manually enters Sleep Mode", () => {
    const result = getPersonNotificationStatus(settings({ manualDndActive: true }), new Date("2026-08-10T15:00:00Z"));
    expect(result.notificationsHeld).toBe(true);
    expect(result.holdReason).toBe("sleep_mode");
  });

  it("holds notifications outside a partner's work hours", () => {
    const result = getPersonNotificationStatus(settings(), new Date("2026-08-10T02:00:00Z"));
    expect(result.notificationsHeld).toBe(true);
    expect(result.holdReason).toBe("outside_work_hours");
  });

  it("allows notification presentation during a partner's active work hours", () => {
    const result = getPersonNotificationStatus(settings(), new Date("2026-08-10T15:00:00Z"));
    expect(result.notificationsHeld).toBe(false);
    expect(result.holdReason).toBeNull();
  });
});
