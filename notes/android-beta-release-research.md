# TARSA Android Beta Release Research

## Official findings

- Google Play supports three testing tracks: **internal**, **closed**, and **open**. Internal testing is designed for initial quality assurance and supports up to 100 testers. Closed testing is for a defined audience and requires sharing the Play Store URL or opt-in link with testers. Source: [Google Play Console Help — Set up an open, closed, or internal test](https://support.google.com/googleplay/android-developer/answer/9845334?hl=en).
- Google notes that developers with **personal accounts created after November 13, 2023** may have specific testing requirements before production release. This may affect future public TARSA Play Store launch planning but does not prevent a small initial beta. Source: [Google Play Console Help — Set up an open, closed, or internal test](https://support.google.com/googleplay/android-developer/answer/9845334?hl=en).
- New Google Play uploads use **Play App Signing** and a signed Android App Bundle (AAB). Android Studio’s official guidance notes that Play Console generates device-specific APKs from an uploaded AAB. Source: [Android Developers — Upload your app to the Play Console](https://developer.android.com/studio/publish/upload-bundle).
- Android 8+ launchers can show notification dots for active notifications. The exact badge/count presentation depends on the device launcher; Android supports custom notification counts via `setNumber()`, but it is not as uniform as iPhone’s app-icon badge. Source: [Android Developers — Modify a notification badge](https://developer.android.com/develop/ui/views/notifications/badges).
- Android push notifications should use Firebase Cloud Messaging. Android 13+ requires runtime notification permission before the app can show notifications. Source: [Firebase — Get started with Firebase Cloud Messaging in Android apps](https://firebase.google.com/docs/cloud-messaging/android/get-started).

## Recommended TARSA Android sequence

1. Keep the iOS TestFlight beta focused on Lynn first.
2. Prepare the existing Capacitor Android project with TARSA name/icon and Firebase Cloud Messaging.
3. Generate a signed AAB and create a Google Play Console app record.
4. Use an **internal testing track** for the first Android tester, then a closed track for additional co-owner couples.
5. Test notifications on at least a Pixel and a Samsung device because launcher badge behavior can differ.

## Native-app architecture decision — August 2026

- TARSA is distributed as installed iOS and Android applications through native app stores. It is not a product users should use in a mobile browser.
- The shared React/TypeScript interface remains a cross-platform application layer when packaged by Capacitor. The iOS and Android projects supply the native app shells, plugins, signing, store delivery, and operating-system permissions.
- **Current configuration:** `capacitor.config.json` names the app `TARSA`, retains the existing `com.businesscadence.calendar` identity, and uses `server.url: https://businesscadence.com`. This means the current iPhone app loads the interface from the hosted address inside its native WebView.
- Capacitor’s official configuration documentation says `server.url` loads an external URL in the WebView and is intended for live reload, **not production**. Capacitor’s official live-reload guide also cautions developers not to commit the server configuration. Sources: [Capacitor Configuration](https://capacitorjs.com/docs/config) and [Capacitor Live Reload](https://capacitorjs.com/docs/guides/live-reload).
- **Recommended follow-up before a public multi-platform release:** remove the production `server.url` and bundle TARSA’s compiled interface (`webDir: dist/public`) into both native projects at each release. The backend and database remain online services; only the interface files become part of the installed mobile apps. This avoids an app shell depending on a public website to load its user interface.

## Cross-platform subscription pricing — August 2026

- TARSA should sell **one business-level subscription** that permits both co-owners to access their shared business, irrespective of their phone brands. Do not charge a couple two subscriptions just because one partner uses Android.
- The broad consumer-spending claims in the supplied note are not TARSA-specific demand research and should not dictate an Android-only lower list price before an actual Android beta has produced conversion data.
- Apple’s Small Business Program lists a 15% commission on paid apps and in-app purchases for qualifying developers. Apple notes that a qualifying small-business developer receives 85% of subscription price each billing cycle. Source: [Apple App Store Small Business Program](https://developer.apple.com/app-store/small-business-program/) and [Apple Auto-Renewable Subscriptions](https://developer.apple.com/app-store/subscriptions/).
- Google Play lists a 15% fee on auto-renewing subscriptions in its remaining-market schedule; for U.S. transactions from June 30, 2026 it lists a 10% subscription service fee plus a 5% billing fee. Source: [Google Play Service Fees](https://support.google.com/googleplay/android-developer/answer/112622?hl=en).
- Therefore, with ordinary U.S. store billing, early-stage Apple and Google subscription economics are close enough that a single U.S. list price is practical. Review actual conversion, churn, refund, support, and payment-fee data after the Android beta before considering experiments such as annual savings or a limited introductory offer.

## TestFlight build-version correction — August 2026

- Lynn’s phone screenshot shows **TARSA 1.0 (12)**, an older TestFlight build with the old app icon and 67 days remaining. This is not the external build currently assigned in App Store Connect, which is displayed as **1.0 (1)** with 89 days remaining.
- Apple documents that external testers must accept the invitation for the specific assigned build in TestFlight. App Store Connect permits specific builds to be assigned to a tester group, external TestFlight builds can require review, and builds are testable for up to 90 days. Source: [Apple TestFlight Overview](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/).
- Apple also documents that iOS app submissions use the combination of marketing version (`CFBundleShortVersionString`) and build number (`CFBundleVersion`) to identify builds; a new marketing version can use a lower build number than a previous marketing version. Source: [Apple — Setting the next build number for Xcode Cloud builds](https://developer.apple.com/documentation/xcode/setting-the-next-build-number-for-xcode-cloud-builds).
- **Recommended TARSA correction:** first resend or reopen Lynn’s invitation and confirm that the TestFlight account shows the assigned `1.0 (1)` build. If it does not appear or cannot replace `1.0 (12)`, issue a clean replacement build whose visible version clearly exceeds the old build, for example `1.0.1 (13)`, assign it to the same external group, and direct Lynn to install that build.
