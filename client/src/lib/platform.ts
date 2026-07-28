/**
 * Platform detection utilities for Capacitor native app vs web browser.
 *
 * When the app runs inside Capacitor (iOS/Android), certain flows differ:
 * - Skip the marketing Landing page
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
