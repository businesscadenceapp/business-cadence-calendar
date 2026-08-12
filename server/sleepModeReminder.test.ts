import { describe, expect, it } from "vitest";
import { hideSleepModeReminder, shouldShowSleepModeReminder } from "../client/src/lib/sleepModeReminder";

function createStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  } as Pick<Storage, "getItem" | "setItem">;
}

describe("Sleep Mode confirmation reminder", () => {
  it("shows the explanation by default", () => {
    expect(shouldShowSleepModeReminder("owner-1", createStorage())).toBe(true);
  });

  it("remembers an individual user's choice to hide the reminder", () => {
    const storage = createStorage();
    hideSleepModeReminder("owner-1", storage);
    expect(shouldShowSleepModeReminder("owner-1", storage)).toBe(false);
    expect(shouldShowSleepModeReminder("owner-2", storage)).toBe(true);
  });
});
