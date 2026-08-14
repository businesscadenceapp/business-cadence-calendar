# TARSA APNs Home Screen Badge Reference

Source: [Capacitor Push Notifications documentation](https://capacitorjs.com/docs/apis/push-notifications), accessed 2026-08-13.

The official Capacitor Push Notifications plugin requires the **Push Notifications** capability to be enabled in the iOS target. `AppDelegate.swift` must forward APNs success and failure callbacks through `capacitorDidRegisterForRemoteNotifications` and `capacitorDidFailToRegisterForRemoteNotifications` notifications.

Capacitor supports a `presentationOptions` configuration. On iOS, `badge` updates the Home Screen app icon badge; TARSA configures badge-only presentation so incoming partner activity does not create an unexpected in-app banner or audible alert.

The plugin registration token is an APNs token on iOS. It requires `checkPermissions`, `requestPermissions` when prompted, and `register`. The APNs HTTP/2 payload includes the badge count.
