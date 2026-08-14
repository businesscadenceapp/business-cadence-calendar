import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const notificationBell = readFileSync(
  resolve(import.meta.dirname, "../client/src/components/NotificationBell.tsx"),
  "utf8"
);

describe("in-app notification bell", () => {
  it("keeps the red unread count on the bell without adding an inline notification banner", () => {
    expect(notificationBell).toContain("unreadCount > 0");
    expect(notificationBell).toContain('backgroundColor: "#DC2626"');
    expect(notificationBell).not.toContain("bannerNotificationId");
    expect(notificationBell).not.toContain("notif-banner-in");
  });

  it("keeps held notifications quiet and opens the related activity from the bell panel", () => {
    expect(notificationBell).toContain("if (notificationsHeld)");
    expect(notificationBell).toContain("notificationsHeld ? 0");
    expect(notificationBell).toContain("handleNotifClick(notif)");
  });
});
