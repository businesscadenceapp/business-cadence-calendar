/**
 * Platform detection utilities for Capacitor native app vs web browser.
 *
 * When the app runs inside Capacitor (iOS/Android), certain flows differ:
 * - Skip the marketing Landing page
 * - Show a native welcome experience on first open
 * - Use native-feeling navigation patterns
 */

import { Capacitor } from "@capacitor/core";

/** Returns true when running inside a Capacitor native shell (iOS or Android) */
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

/** Returns the native platform name or 'web' */
export function getPlatform(): "ios" | "android" | "web" {
  return Capacitor.getPlatform() as "ios" | "android" | "web";
}

// Increment this version when you want to force the welcome screen to show again
// (e.g. after a major update with new onboarding content)
const WELCOME_VERSION = "v3";
const WELCOME_KEY = `bcc_welcome_seen_${WELCOME_VERSION}`;

/** Check if the user has seen the welcome intro (persisted per device) */
export function hasSeenWelcome(): boolean {
  try {
    return localStorage.getItem(WELCOME_KEY) === "true";
  } catch {
    return false;
  }
}

/** Mark the welcome intro as seen */
export function markWelcomeSeen(): void {
  try {
    localStorage.setItem(WELCOME_KEY, "true");
  } catch {
    // ignore storage errors
  }
}
