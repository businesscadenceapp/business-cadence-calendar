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
- [x] iOS build verification of VoiceRecorderSPM — RESOLVED: VoiceRecorderSPM and capacitor-voice-recorder removed entirely (recording feature removed per user decision). No longer needed.
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
- [x] Checkpoint so the CI fix syncs to GitHub / Xcode Cloud (cc735946)

## Follow-up: Push latest code to user's GitHub repo (triggers Xcode Cloud build 13)
- [x] Identified GitHub repo: businesscadenceapp/business-cadence-calendar
- [x] Pushed latest checkpoint (cc735946) to GitHub (8362484..cc73594 main -> main)
- [x] Confirm Xcode Cloud build 13 starts and passes; watch for VoiceRecorderSPM compile result

## Remove Meeting Recording Feature (user decision)
- [x] Audit all recording-related files (client, server, DB, native)
- [x] Remove RecordMeeting.tsx component and useAudioRecorder.ts hook
- [x] Remove recording display/playback from meeting detail UI in calendar
- [x] Remove server recording routes (meeting.recording.upload, meeting.recording.get)
- [x] Remove DB helpers for meeting_recordings and drop the table (0 rows, confirmed empty)
- [x] Remove capacitor-voice-recorder npm package
- [x] Remove VoiceRecorderSPM iOS vendored package and Xcode project references
- [x] Remove iOS NSMicrophoneUsageDescription and Android RECORD_AUDIO permission
- [x] Remove voice-recorder vendoring step from ci_post_clone.sh and package.json cap:sync script
- [x] Remove server/_core/voiceTranscription.ts (no remaining imports)
- [x] Run tests (10/10 pass), typecheck (0 errors), checkpoint and push to GitHub

## Welcome Cards Update (new session continuation)
- [x] Install @revenuecat/purchases-capacitor (fix build error from subscription task fast-forward)
- [x] Add new shield-heart welcome card: "Capture every idea. Protect your relationship." (card 4, between chat-bubble and pricing cards)
- [x] Checkpoint and push to GitHub (triggers Xcode Cloud build)

## Post-Subscribe Flow Redesign
- [x] Replace shield-heart card with crescent moon card — THE SOLUTION badge, new wording, no stars
- [x] Remove /welcome flow entirely — single onboarding path via /subscribe-intro
- [x] Restructure onboarding to 4 clean story-arc cards (remove calendar card)
- [x] Fix MOST POPULAR badge overlapping plan name on paywall
- [x] Build SetupChoice, InvitePartnerSetup, WaitingForPartner pages
- [x] Rebuild InvitePartnerSetup as full-bleed native screen (business name + partner email)
- [x] Rebuild WaitingForPartner with native mobile design
- [x] Redesign post-subscribe flow: invite-first, native iPhone feel (remove SetupChoice)
- [x] Paywall routes directly to InvitePartnerSetup after subscribing
- [x] InvitePartnerSetup: added business name field, removed back-to-setup-choice, added self-setup escape hatch
- [x] Create app storyboard PDF walkthrough

## Onboarding Friction Reduction (from user critique)
- [x] Cut business onboarding to 3 essential steps (business name, timezone/hours, invite partner)
- [x] Add deferred "Complete your profile" prompt on Board for goals/KPIs/industry/team
- [x] Add sandbox preview mode with sample data to WaitingForPartner screen
- [x] Make 14-day free trial the paywall headline
- [x] Verify, run tests, checkpoint, push to GitHub (0551068 → github main, triggers Xcode Cloud)

## Bug: "Explore the app" loops back to beginning
- [x] Diagnose: EntitlementGuard bounces no_subscription users back to /subscribe-intro; WaitingForPartner was routing to /app/board before onboarding/trial was set up
- [x] Fix (product decision: onboarding-first): WaitingForPartner CTA changed to "Set up my business →" → /onboarding (quick mode). handleConfirm calls startTrial as safety net so DB has trial row before /app/board is reached. After quick onboarding completes, user lands on /select-business → /app/board with valid entitlement.
- [x] Verify, run tests, checkpoint (a0485f2e), push to GitHub
