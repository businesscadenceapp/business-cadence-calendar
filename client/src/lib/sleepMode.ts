export const SLEEP_MODE_STORAGE_KEY = "bc_off_the_clock";
export const SLEEP_MODE_EVENT = "bc-sleep-mode-changed";

type StorageLike = Pick<Storage, "getItem" | "setItem">;

function browserStorage(): StorageLike | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function getSleepMode(storage: StorageLike | null = browserStorage()): boolean {
  try {
    return storage?.getItem(SLEEP_MODE_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function setSleepMode(enabled: boolean, storage: StorageLike | null = browserStorage()): boolean {
  try {
    storage?.setItem(SLEEP_MODE_STORAGE_KEY, String(enabled));
  } catch {
    // Sleep Mode remains usable for this screen even if browser storage is unavailable.
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(SLEEP_MODE_EVENT, { detail: enabled }));
  }

  return enabled;
}
