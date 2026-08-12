import { describe, expect, it } from "vitest";
import { getSleepMode, setSleepMode } from "../client/src/lib/sleepMode";

function createStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  } as Pick<Storage, "getItem" | "setItem">;
}

describe("Sleep Mode preference", () => {
  it("defaults to Work Mode when no preference is saved", () => {
    expect(getSleepMode(createStorage())).toBe(false);
  });

  it("persists notification silencing independently from application access", () => {
    const storage = createStorage();
    setSleepMode(true, storage);
    expect(getSleepMode(storage)).toBe(true);

    setSleepMode(false, storage);
    expect(getSleepMode(storage)).toBe(false);
  });
});
