export const SLEEP_MODE_REMINDER_KEY_PREFIX = "bc_sleep_mode_reminder_hidden_";

type StorageLike = Pick<Storage, "getItem" | "setItem">;

export function sleepModeReminderKey(personId?: string) {
  return `${SLEEP_MODE_REMINDER_KEY_PREFIX}${personId || "anonymous"}`;
}

export function shouldShowSleepModeReminder(personId?: string, storage?: StorageLike | null) {
  try {
    const target = storage ?? (typeof window === "undefined" ? null : window.localStorage);
    return target?.getItem(sleepModeReminderKey(personId)) !== "true";
  } catch {
    return true;
  }
}

export function hideSleepModeReminder(personId?: string, storage?: StorageLike | null) {
  try {
    const target = storage ?? (typeof window === "undefined" ? null : window.localStorage);
    target?.setItem(sleepModeReminderKey(personId), "true");
  } catch {
    // A private browser can still use Sleep Mode; it will simply show the reminder again.
  }
}
