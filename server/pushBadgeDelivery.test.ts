import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("iPhone Home Screen badge delivery", () => {
  it("sends a silent APNs badge update without an alert payload", () => {
    const apns = read("server/apns.ts");
    expect(apns).toContain('"apns-push-type": "background"');
    expect(apns).toContain('"content-available": 1, badge');
    expect(apns).toContain("for (const environment of [\"sandbox\", \"production\"] as const)");
  });

  it("registers only native iPhones and respects held-notification rules", () => {
    const nativeRegistration = read("client/src/components/NativePushRegistration.tsx");
    const database = read("server/db.ts");
    const appDelegate = read("ios/App/App/AppDelegate.swift");
    const capacitorConfig = read("capacitor.config.json");
    expect(nativeRegistration).toContain('Capacitor.getPlatform() !== "ios"');
    expect(nativeRegistration).toContain("PushNotifications.requestPermissions()");
    expect(nativeRegistration).toContain("trpc.pushDevice.register.useMutation()");
    expect(database).toContain("if (status.notificationsHeld) return;");
    expect(database).toContain("updateIosBadge(token, unreadCount)");
    expect(appDelegate).toContain("capacitorDidRegisterForRemoteNotifications");
    expect(capacitorConfig).toContain('"presentationOptions": ["badge"]');
  });

  it("validates that a registered device belongs to the stated account", () => {
    const routers = read("server/routers.ts");
    expect(routers).toContain("Device registration does not match this account");
    expect(routers).toContain("await upsertPushDevice(input)");
  });
});
