import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const notificationBell = readFileSync(
  resolve(import.meta.dirname, "../client/src/components/NotificationBell.tsx"),
  "utf8"
);

describe("in-app notification banner", () => {
  it("presents the newest unread notification in a visible mobile banner", () => {
    expect(notificationBell).toContain("bannerNotificationId");
    expect(notificationBell).toContain("newestUnread");
    expect(notificationBell).toContain('className="md:hidden"');
    expect(notificationBell).toContain("notif-banner-in");
  });

  it("keeps held notifications quiet and allows the banner to open the related activity", () => {
    expect(notificationBell).toContain("if (notificationsHeld)");
    expect(notificationBell).toContain("setBannerNotificationId(null)");
    expect(notificationBell).toContain("handleNotifClick(bannerNotification)");
    expect(notificationBell).toContain("dismissBanner(bannerNotification.id)");
  });
});
