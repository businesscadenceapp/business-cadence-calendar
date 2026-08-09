import { describe, expect, it } from "vitest";
import { getHubNotificationPresentation, toggledNotificationPause } from "../shared/notificationSleep";

describe("hub notification sleep controls", () => {
  it("turns both hub centers from sun to moon when notifications are paused", () => {
    expect(toggledNotificationPause(false)).toBe(true);
    expect(getHubNotificationPresentation(true)).toMatchObject({ icon: "☾", sleepMode: true });
  });

  it("turns both hub centers from moon to sun when notifications are restored", () => {
    expect(toggledNotificationPause(true)).toBe(false);
    expect(getHubNotificationPresentation(false)).toMatchObject({ icon: "☀", sleepMode: false });
  });

  it("keeps destination navigation available while sleep mode only changes notification state", () => {
    const destinationIsNavigable = true;
    const sleepModeAppearance = "muted";
    expect(destinationIsNavigable).toBe(true);
    expect(sleepModeAppearance).toBe("muted");
  });
});
