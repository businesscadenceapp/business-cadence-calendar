# Business Cadence — Native Build Guide (iOS & Android)

This project ships the web app plus fully prepared Capacitor native projects
(`ios/` and `android/`). Icons, splash screens, permissions, and native audio
recording are already configured. This guide walks through building and
submitting to the App Store and Google Play.

---

## What is already configured

| Item | Status |
|---|---|
| App ID | `com.businesscadence.calendar` |
| App name | Business Cadence Command Center |
| App icon (all sizes, iOS + Android adaptive) | Generated from brand note logo, navy `#0A1929` + teal |
| Splash screens (light/dark, all densities) | Generated, navy with wordmark |
| Status bar / splash config | `capacitor.config.json` (dark style, `#0A1929`) |
| Microphone permission | Android `RECORD_AUDIO` + iOS `NSMicrophoneUsageDescription` |
| Native meeting recording | `capacitor-voice-recorder` on device, browser MediaRecorder on web (`client/src/hooks/useAudioRecorder.ts`) |
| iOS SPM wrapper for voice recorder | `ios/VoiceRecorderSPM/` (see note below) |

### Server URL
The native apps load the **published web app**. Before building for
production, point Capacitor at the live site by adding to
`capacitor.config.json`:

```json
"server": { "url": "https://businesscadence.com", "androidScheme": "https" }
```

(Leave it out to bundle the static build instead; the app is a full-stack
tRPC app, so the hosted-URL mode is the recommended and tested path.)

---

## One-time prerequisites

- **macOS with Xcode 15+** (iOS builds are only possible on a Mac)
- **Android Studio** (any OS)
- **Apple Developer Program** membership ($99/yr) for App Store submission
- **Google Play Console** account ($25 one-time)
- Node 22 + pnpm installed locally; clone/download this project (Management UI → ⋯ → Download as ZIP, or GitHub export)

---

## Build steps (both platforms)

```bash
pnpm install          # installs deps (runs the wouter patch automatically)
pnpm cap:sync         # builds web bundle, vendors the voice-recorder SPM
                      # package, and syncs both native projects
```

## iOS

```bash
pnpm cap:open:ios     # opens ios/App in Xcode
```

1. In Xcode, select the **App** target → *Signing & Capabilities* → choose
   your team; Xcode will provision automatically.
2. **First-build verification (IMPORTANT):** the `capacitor-voice-recorder`
   plugin ships CocoaPods-only, so this project vendors it as a local Swift
   package at `ios/VoiceRecorderSPM` (already referenced by the Xcode
   project). This wrapper has been structurally validated but has **not yet
   been compiled on a real Mac** — sandbox tooling is Linux-only. On first
   build: File → Packages → *Resolve Package Versions*, then ⌘B. If the
   `VoiceRecorderPlugin` target fails to compile, report the error message
   back and it can be patched from here. The `cap sync` warning
   `capacitor-voice-recorder does not have a Package.swift` is expected and
   harmless — the vendored package replaces that linkage.
3. Run on a device/simulator (⌘R) and smoke-test: log in, open a meeting in
   the Command Center, record a short clip, confirm AI notes generate.
4. Archive: Product → *Archive* → Distribute App → App Store Connect.
5. In [App Store Connect](https://appstoreconnect.apple.com): create the app
   (bundle ID `com.businesscadence.calendar`), fill in listing metadata,
   add the microphone-usage explanation in App Review notes, submit for
   TestFlight first, then App Store review.

## Android

```bash
pnpm cap:open:android   # opens android/ in Android Studio
```

1. Let Gradle sync finish; run on an emulator/device and smoke-test the
   same flows (login, board, meeting recording).
2. Create a release keystore: Build → *Generate Signed Bundle/APK* →
   Android App Bundle → create new keystore (**back it up — losing it means
   you can never update the app**).
3. Build the signed `.aab`.
4. In [Play Console](https://play.google.com/console): create the app,
   upload the bundle to an internal testing track, complete the Data Safety
   form (declare microphone use for meeting recording), then promote to
   production review.

---

## Regenerating icons / splash screens

Source images live in `assets/` (`icon-only.png`, `icon-foreground.png`,
`icon-background.png`, `splash.png`, `splash-dark.png`). After changing them:

```bash
npx @capacitor/assets generate --ios --android \
  --iconBackgroundColor '#0A1929' \
  --splashBackgroundColor '#0A1929' --splashBackgroundColorDark '#0A1929'
```

---

## Known follow-ups

- **VoiceRecorderSPM compile verification on macOS** (step 2 above) — the
  only item that could not be verified in this environment.
- App Store screenshots/preview media still need to be produced once the
  final build runs on a device.
