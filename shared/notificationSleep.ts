export type HubNotificationPresentation = {
  icon: "☀" | "☾";
  color: string;
  label: string;
  sleepMode: boolean;
};

/** Notification sleep mode changes feedback only; destination navigation remains available. */
export function getHubNotificationPresentation(notificationsPaused: boolean): HubNotificationPresentation {
  return notificationsPaused
    ? {
        icon: "☾",
        color: "#DDD6FE",
        label: "Sleep mode is on — tap to restore notifications",
        sleepMode: true,
      }
    : {
        icon: "☀",
        color: "#FDE68A",
        label: "Notifications are active — tap to pause them",
        sleepMode: false,
      };
}

export function toggledNotificationPause(currentlyPaused: boolean): boolean {
  return !currentlyPaused;
}
