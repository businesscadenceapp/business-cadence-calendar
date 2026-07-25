# Session TODO — Mobile Optimization + Capacitor Build Prep

## Phase 0: Dev server health
- [x] Fix ERR_MODULE_NOT_FOUND dev server error (removed broken expo tsconfig extends, excluded expo-entry.tsx)

## Mobile Layout Optimization (High Priority #1)
- [x] Board page: audited at 375x812 — renders cleanly (2x2 card grid, FAB)
- [x] Goals page: audited — header row and empty state fit cleanly
- [x] KPIs page: audited — cards already stack vertically
- [x] Reports page: audited — tab icons and segmented control fit
- [x] Calendar/Command Center: audited — summary cards 2-col, calendar grid fits
- [x] Settings page: audited — stacked panels render cleanly
- [x] WeeklyCheckin page: audited — full-width form fits
- [x] AppShell: fixed cramped Owner/Team header pill (icon-only <390px, labels ≥390px)
- [x] Spot-check interactive views: board Tasks section, bottom-sheet compose modal, calendar day/meeting detail — all render cleanly at 375x812
- [x] Verify bottom tab bar + safe-area insets via DOM geometry check (fixed bottom:0, h:56, env(safe-area-inset-bottom) applied; hidden in dev screenshots only by Manus preview banner)

## Capacitor Native Build Prep (High Priority #2)
- [x] Generate 1024x1024 app icon (programmatic PIL composition from existing brand note PNG — no AI imagery)
- [x] Generate splash screen assets (light/dark, 2732x2732, navy + wordmark)
- [x] Run @capacitor/assets: iOS 7 assets + Android 74 assets (adaptive icons, splash densities)
- [x] Verify capacitor.config settings (appId com.businesscadence.calendar, splash #0A1929, status bar dark)
- [x] Add Android platform (npx cap add android)
- [x] RecordMeeting.tsx: use capacitor-voice-recorder on native platform (useAudioRecorder hook, platform-aware)
- [x] Mic permissions: Android RECORD_AUDIO + iOS NSMicrophoneUsageDescription
- [x] iOS SPM fix implemented: vendored VoiceRecorderSPM local Swift package (plugin ships CocoaPods-only), registered in Xcode project, wired into cap:sync script
- [ ] iOS build verification of VoiceRecorderSPM — BLOCKED: requires macOS/Xcode, unavailable in this Linux sandbox. Handed off to user via NATIVE_BUILD.md (structural validation done: pbxproj balanced, package layout mirrors official @capacitor SPM plugins). Remains open until user confirms a successful Xcode build.
- [x] Sync native projects (cap sync — 7 plugins on both platforms)

## Verification
- [x] Screenshot all pages at mobile viewport (375x812) — 9 pages + interactive views audited, board/calendar re-verified after changes
- [x] Run vitest suite (10/10 pass)
- [x] TypeScript check (clean)
- [x] Save checkpoint (e5f841a0, auto-published)

## Delivery
- [x] Write NATIVE_BUILD.md with step-by-step iOS/Android build + store submission instructions
- [x] Final delivery message

## Follow-up: Xcode Cloud pipeline (user already has Apple Developer account + GitHub + Xcode Cloud from Mac session)
- [x] Add voice-recorder vendoring step to ios/App/ci_scripts/ci_post_clone.sh so Xcode Cloud builds include VoiceRecorderSPM sources
- [ ] Checkpoint so the CI fix syncs to GitHub / Xcode Cloud
