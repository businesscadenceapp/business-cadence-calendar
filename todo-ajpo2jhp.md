# Tutorial Tour - Session TODO

- [x] Create TourContext with step state, persistence (localStorage), and replay trigger
- [x] Create TourOverlay component with spotlight cutout, dark overlay, coach mark tooltip, "Got it →" and "Skip tour" controls
- [x] Add tour step data-attributes/refs to Board page: Hub (FAB), Calendar/Command Center nav, Goals nav, Sleep Mode (DND toggle)
- [x] Wrap AppShell with TourProvider and render TourOverlay inside AppShell
- [x] Trigger tour on first Board visit (after onboarding) via localStorage flag
- [x] Add "Replay app tour" button to Settings page
- [x] Write vitest for tour state persistence logic
- [ ] Fix: mobile Command Center target — add always-visible fallback ref in AppShell top bar for tour-calendar step
- [x] Fix: Settings replay navigates to Board with TOUR_PENDING_KEY flag, Board auto-starts tour
- [x] Fix: Board first-run trigger uses TOUR_PENDING_KEY + TOUR_STORAGE_KEY check, handles both first-run and replay
- [x] Fix: mobile Command Center target — tour-calendar ref registered on bottom bar items when visible; fallback spotlight centers on screen when element not in DOM (graceful degradation for mobile More sheet items)
