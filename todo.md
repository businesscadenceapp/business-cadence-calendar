# Business Cadence Calendar — TODO

- [x] Yearly calendar view with all 12 months
- [x] Color-coded meeting type dots (Daily Huddle, Weekly L10, Monthly Finance, Quarterly Offsite)
- [x] Left sidebar with meeting type legend and business list
- [x] Summary strip showing annual meeting counts
- [x] Day click to open detail panel
- [x] Per-business time breakdown in detail panel (collapsible blocks)
- [x] Quarterly Offsite moved to first Friday of quarter months
- [x] Quarterly Offsite highlighted with red border and OFFSITE badge
- [x] Hover legend to highlight meeting type across calendar
- [x] Upgrade to full-stack (database + backend + user auth)
- [x] Database schema: meeting_logs and agenda_items tables
- [x] Backend tRPC routes: get, saveNotes, toggleItem, generateSummary
- [x] Interactive agenda checkboxes per business block
- [x] Progress bar showing completion per meeting type
- [x] Auto-saving notes textarea (debounced 800ms)
- [x] AI summary generation via LLM, persisted to database
- [x] Summary regeneration button
- [x] All vitest tests passing (6 tests)
- [x] Per-agenda-item inline comment fields (auto-saved, debounced)
- [x] AI summary uses item comments + notes combined
- [x] Green dot indicator on calendar days with saved logs
- [ ] ICS export for Google/Apple Calendar import (future enhancement)
- [ ] Printable one-page yearly summary PDF (future enhancement)
- [ ] Issues List tracker (shared notepad for mid-week issues) (future enhancement)
- [ ] Per-business KPI scorecard templates (future enhancement)
- [x] Command Board: database schema (board_cards table with author, type, business, content, seenAt)
- [x] Command Board: backend tRPC routes (list, create, markSeen, delete)
- [x] Command Board: UI page with Updates and Issues sections
- [x] Command Board: Matt (blue) and Lynn (pink) color coding per card
- [x] Command Board: business tag filter (All / Chiropractic / CrossFit / Realty)
- [x] Command Board: "Seen ✓" acknowledgment button per card
- [x] Command Board: navigation tab between Calendar and Board views
- [x] Password gate: store SITE_PASSWORD as secret env variable
- [x] Password gate: backend tRPC route to validate password and return session token
- [x] Password gate: frontend lock screen shown before any content
- [x] Password gate: remember authentication in localStorage so re-entry not needed per device
- [x] Custom agenda: database table for agenda templates (per business, per meeting type)
- [x] Custom agenda: backend tRPC routes (get templates, save templates)
- [x] Custom agenda: Settings page with per-business per-meeting-type editor
- [x] Custom agenda: password re-entry required before saving changes
- [x] Custom agenda: calendar detail panel uses custom items when available, defaults otherwise
- [x] Custom agenda: past meeting logs preserve their original items unchanged
- [ ] Snapshot agenda item labels into each meeting log on first edit (future enhancement)
- [ ] Render historical meeting logs from saved per-log label snapshots (future enhancement)


## BusinessCadence Marketing Homepage (Phase 2)

- [x] Update global color palette to warm off-white system (#F8F7F4 bg, #1E3A5F navy, #0D9488 teal)
- [x] Update index.css with new design tokens and Google Fonts (Inter)
- [x] Build top navigation with BusinessCadence logo and CTA button
- [x] Build Hero section: headline targeting reactive business conversations pain, subheadline, waitlist CTA
- [x] Build Pain/Problem section: 5 mistakes small business owners make
- [x] Build Features section: meeting cadence calendar, command board, AI summaries, customizable agendas
- [x] Build Founder Story section: anonymous co-owning couple story
- [x] Build Waitlist signup section: email capture form with backend storage
- [x] Build Footer with logo, tagline, and links
- [x] Add waitlist_emails table to DB schema and push migration
- [x] Add waitlist tRPC procedure (submit email, check duplicate)
- [x] Add owner notification on new waitlist signup
- [x] Add smooth scroll animations and micro-interactions
- [x] Test responsiveness on mobile and tablet
- [x] Save checkpoint

## Client Login Portal (Phase 3)

- [x] Add "Client Login" button/section to the marketing homepage nav and footer
- [x] Build business selection modal/page: New Beginnings Chiropractic, CrossFit, All Three Businesses
- [x] Store selected business context in localStorage so the calendar app knows which view to default to
- [x] Pass business context through to the password gate and calendar app
- [x] Update calendar app Home.tsx to default to the selected business on load
- [x] Save checkpoint

## Three-Account Authentication System (Phase 4)

- [x] Add app_users table to drizzle schema (username, hashed password, business scope, role)
- [x] Push DB migration and seed three accounts: chiro/subluxation, crossfit/burpee, owner/lynnandmatt901
- [x] Update server gate.verify procedure to validate username + password and return scope + session token
- [x] Update ClientLogin frontend to send username + password and store scope in session
- [x] Update PasswordGate to use new session token with scope
- [x] Update calendar app to filter meeting data by business scope from session
- [x] Test all three accounts in isolation
- [x] Save checkpoint

## Meeting Recording Feature (Phase 5)
- [x] Add meeting_recordings table to DB schema (meetingId, transcript, aiNotes, actionItems, audioKey, createdAt)
- [x] Push DB migration
- [x] Add server-side tRPC procedure: upload audio → Whisper transcription → LLM processing → save to DB
- [x] Build RecordMeeting UI component: mic button, recording timer, stop, upload progress, AI notes display
- [x] Wire RecordMeeting into the meeting detail/Board view
- [x] Display past recording notes when viewing a meeting that was previously recorded
- [x] Test full flow end-to-end on desktop and mobile
- [x] Save checkpoint

## Onboarding Wizard + Editable Schedule (Phase 6)

### DB Schema
- [x] Add `business_profiles` table (accountId, businessName, industry, ownerCount, employeeCount, workDays, preferredMeetingDays, onboardingComplete)
- [x] Add `closed_periods` table (accountId, startDate, endDate, label, type: day|week)
- [x] Add `meeting_schedule_overrides` table (accountId, originalDate, meetingType, rescheduledDate, reason)
- [x] Push DB migration

### Industry Agenda Templates
- [x] Define industry-specific default agenda items for all 9 industry types × 4 meeting types (daily/weekly/monthly/quarterly)
- [x] Store templates in a `industry_agenda_defaults` constant/seed file
- [x] Industries: Healthcare/Medical, Fitness & Wellness, Real Estate, Retail/E-commerce, Restaurant/Food Service, Professional Services, Construction/Trades, Salon/Spa/Beauty, Other

### Onboarding Backend
- [x] tRPC `onboarding.save` — save business profile answers to DB
- [x] tRPC `onboarding.getStatus` — check if current account has completed onboarding
- [x] tRPC `onboarding.generateCalendar` — use profile answers to generate meeting schedule for the year
- [x] Calendar generation logic: place meetings on correct days, skip closed periods, auto-shift to next available day

### Onboarding Frontend (multi-step wizard)
- [x] Step 1: Welcome screen — "Let's set up your BusinessCadence calendar"
- [x] Step 2: Business basics — name, industry dropdown (9 options)
- [x] Step 3: Team size — number of owners/partners, number of employees
- [x] Step 4: Work schedule — which days of week they operate (checkboxes)
- [x] Step 5: Owner meeting preferences — preferred day for each cadence (daily/weekly/monthly)
- [x] Step 6: Team meeting preferences — preferred day for team standups and team weekly
- [x] Step 7: Preview — show generated calendar before confirming
- [x] Step 8: Done — celebration screen, redirect to calendar

### Editable Schedule
- [x] "Manage Schedule" button in calendar sidebar
- [x] UI to add/remove closed days (single date picker) and closed weeks (week range picker)
- [x] When a closed day is added, find all meetings on that date and auto-shift to next available same-weekday
- [ ] Visual indicator on rescheduled meetings (small "moved" badge or different border style) — future enhancement
- [x] tRPC `schedule.addClosedPeriod` — add a closed day/week
- [x] tRPC `schedule.removeClosedPeriod` — remove a closed period
- [x] tRPC `schedule.getClosedPeriods` — list all closed periods for account
- [x] tRPC `schedule.getOverrides` — list all rescheduled meetings

### Integration
- [x] Trigger onboarding wizard on first login (check localStorage flag + server profile)
- [x] `accountId` stored in localStorage after login for use by onboarding + schedule pages
- [x] Replace static `calendarData.ts` meeting placement with dynamic schedule from DB — Phase 7
- [ ] Owner toggle button (Owner Mode ↔ Team Mode) — owners only, deferred until Team Layer built

### Known Gaps / Phase 7 Work
- [x] Replace static `calendarData.ts` calendar rendering in Home.tsx with DB-driven dynamic schedule (so closed-day changes visibly reschedule meetings in the main calendar)
- [x] Persist meeting reschedule overrides when closed periods affect meetings; surface them via `schedule.getOverrides`
- [x] Use `trpc.onboarding.getStatus` during app entry to verify onboarding completion from server state (not just localStorage flag)
- [x] Show a real generated calendar preview in onboarding Step 7 (call `trpc.onboarding.generateCalendar` and render upcoming meetings before confirmation)

## Weekly Report System (Phase 7)

### DB Schema
- [x] Add `employees` table (accountId, name, role, isActive, sortOrder, createdAt, updatedAt)
- [x] Add `employee_metrics` table (employeeId, label, unit, sortOrder)
- [x] Add `weekly_reports` table (employeeId, weekKey YYYY-Www, submittedAt, submittedByOwnerId, updatedAt)
- [x] Add `weekly_report_entries` table (reportId, metricId, value, createdAt)
- [x] Push DB migration (migration 0008)

### Backend
- [x] tRPC `weeklyReport.getEmployees` — list employees with their metrics for an account
- [x] tRPC `weeklyReport.saveEmployee` — create/update employee + their metrics
- [x] tRPC `weeklyReport.deleteEmployee` — soft-delete an employee
- [x] tRPC `weeklyReport.submitReport` — owner submits numbers for an employee for a given week
- [x] tRPC `weeklyReport.getSummary` — get this week + last week data for all employees (for owner summary view)
- [ ] tRPC `weeklyReport.getHistory` — get N weeks of history for a single employee (future enhancement)

### Frontend
- [x] Employee Setup page (`/app/employees`): list employees, add/edit name + role + metrics
- [x] Link to Employee Setup from calendar sidebar ("👥 Employee Setup" button)
- [x] Weekly Report panel (`WeeklyReportPanel`) inside weekly meeting detail
- [x] Owner summary view: cards per employee showing this week vs last week with delta badges (▲▼)
- [x] Submission status badge: "✓ Submitted" vs "⏳ Pending" per employee card
- [x] Number entry form: owner enters numbers on behalf of each employee

### Integration
- [x] Wire `WeeklyReportPanel` into Home.tsx `MeetingSection` for `weekly` meeting type
- [x] Save checkpoint

## Weekly Reports Redesign (Phase 8)
- [x] Remove WeeklyReportPanel from MeetingSection in Home.tsx
- [x] Build standalone WeeklyReports page (/app/reports) with full-width layout
- [x] Full-width employee cards with proper spacing and readable number inputs
- [x] Add "Reports" tab to main navigation (alongside Calendar and Board)
- [x] Label Reports tab as Team layer (owners + employees)
- [x] Save checkpoint

## Command Board Upgrade — Tasks + Two-Step Completion (Phase 9)

### DB Schema
- [x] Add `completedAt`, `completedBy`, `confirmedAt`, `confirmedBy` columns to `board_cards` table
- [x] Add `assignedTo` column to `board_cards` (who the task is assigned to)
- [x] Push DB migration

### Backend
- [x] tRPC `board.markDone` — doer marks task as done (sets completedAt + completedBy)
- [x] tRPC `board.confirmDone` — requester confirms task is done (sets confirmedAt + confirmedBy)
- [x] Update `board.list` to return completedAt, confirmedAt, assignedTo fields
- [x] Update `board.create` to accept `assignedTo` for Task type

### Frontend
- [x] Add "Task" as a third card type (alongside Update and Issue)
- [x] Task cards show assignee, checkbox for doer to mark done
- [x] Two-step flow: doer checks off → card moves to "Done — Awaiting Confirmation" section
- [x] Requester sees "Confirm Done" button → confirms → card moves to collapsed archive
- [x] Board sections: Active | Done — Awaiting Confirmation | Completed (collapsible)
- [x] Fix identity selector: persist "I am Matt / Lynn" in localStorage (set once per device)
- [x] Remove redundant top-right identity selector from board header
- [x] When posting a Task, show "Assign to:" dropdown (the other owner)

## Calendar Auto-Scroll to Today (Phase 11)
- [x] Add `currentMonthRef` + `hasScrolledToToday` guard so calendar scrolls to current month exactly once
- [x] Scroll fires after DB calendar data loads (not just on initial render)
- [x] Remove old inline ref callback that fired on every render

## Light Theme Redesign (Phase 10)
- [x] Audit homepage colors and extract exact values (bg, text, accent, card, border)
- [x] Update index.css with light theme CSS variables matching homepage palette
- [x] Redesign Home.tsx (calendar) — light bg, navy text, teal accents, readable dates
- [x] Redesign Board.tsx — light cards, Matt=blue, Lynn=coral, readable on white
- [x] Redesign ClientLogin.tsx — already light-compatible (no changes needed)
- [x] Redesign Onboarding.tsx — already light-compatible (no changes needed)
- [x] Redesign ManageSchedule.tsx — already light-compatible (no changes needed)
- [x] Redesign EmployeeSetup.tsx — already light-compatible (no changes needed)
- [x] Redesign WeeklyReports.tsx — light employee cards
- [x] Redesign Settings.tsx — light theme + renamed "Weekly Level 10" → "Weekly Review"
- [x] Screenshot all pages to verify readability
- [x] Save checkpoint

## Business Scope Filtering (Phase 11)
- [x] Command Board: filter "Which business?" form options by account scope (chiro sees only Chiropractic+General)
- [x] Command Board: filter "Filter by Business" sidebar by account scope (hide irrelevant businesses)
- [x] Command Board: filter card list to only show cards for allowed businesses
- [x] Command Board: hide business selector entirely for single-business accounts
- [x] Settings: filter business selector to only show businesses for current account scope
- [x] Add gate.getScope tRPC procedure (returns scope + displayName for a given accountId)

## Month-Focused Calendar View (Phase 12)
- [x] Default calendar view shows current month only (no full-year scroll)
- [x] Add prev/next month navigation buttons (← / →)
- [x] Add "Today" button that jumps back to current month from any month
- [x] Show current month name + year as a heading (e.g. "July 2026")
- [x] Add year-view toggle button (e.g. "Year View" / "Month View") to switch between modes
- [x] Year view shows all 12 months in the existing grid layout
- [x] Persist the selected view mode in localStorage so it survives page refresh
- [x] Remove the auto-scroll-to-today logic (no longer needed in month view)
- [x] Save checkpoint

## App Restructure: Command Board as Main Character (Phase 13)

### Navigation & Routing
- [x] Change default route after login from `/app` (calendar) to `/app/board`
- [x] Reorder nav items: Board (1st), Goals (2nd), Reports (3rd), Calendar (4th), Schedule (5th), Settings (last)
- [x] Update mobile nav and desktop sidebar to reflect new order
- [x] Rename "Board" nav label to "Command Board" for clarity

### Command Board UI Polish
- [x] Redesign card layout: larger, more breathing room, cleaner visual hierarchy
- [x] Add owner avatar/color chip to each card (Matt=navy, Lynn=coral) so authorship is instant
- [x] Make the "Post" button more prominent — primary CTA on the board
- [x] Improve the Active / Awaiting Confirmation / Completed section headers
- [x] Add empty state for when the board is clear ("All clear — nothing pending")
- [x] Smooth card entry animation (slide in from bottom)

### Goals Page
- [x] Audit current Goals page — determine if it exists or needs to be created
- [x] If missing: create Goals page with ability to add/edit quarterly and annual goals per business
- [x] Goals should be visible from the main nav (second position)
- [x] Link goals to meeting types (quarterly goals shown in quarterly meeting detail)

### Overall Layout Polish
- [x] First screen after login should feel like a "command center" not a calendar
- [x] Tighten header height, give main content more vertical space
- [x] Today's date more prominent in calendar month view
- [x] Meeting dots slightly larger and more readable on mobile
- [x] Save checkpoint

## Seamless Navigation — AppShell (Phase 14)
- [x] Create `AppShell` layout component with persistent sidebar (desktop, 220px) + bottom tab bar (mobile)
- [x] Sidebar: logo/brand at top, 5 nav items (Board, Goals, Reports, Calendar, Settings), identity selector at bottom
- [x] Bottom tab bar (mobile): 5 icon+label tabs always visible at bottom, active state highlighted
- [x] Animated page transitions: fade+slide between sections (150ms ease-out)
- [x] Remove per-page header nav from Board.tsx — use AppShell instead
- [x] Remove per-page header nav from Goals.tsx — use AppShell instead
- [x] Remove per-page header nav from Home.tsx calendar — use AppShell instead
- [x] Remove per-page header nav from Reports page — use AppShell instead
- [x] Wire all /app/* routes through AppShell in App.tsx
- [x] Identity selector (I am Matt/Lynn) moved to AppShell sidebar bottom
- [x] Save checkpoint

## Per-Person Auth + Employee Layer (Phase 15)

### DB Schema
- [x] Add `persons` table: id, accountId, name, email, role (owner|coowner|employee), businessScope, hashedPassword, inviteToken, inviteAccepted, createdAt
- [x] Update `board_cards` table: add `dueAt` (bigint timestamp, nullable), `assignedToPersonId` (text, nullable)
- [x] Add `kpi_categories` table: id, accountId, businessId, name, unit, frequency (weekly|monthly), sortOrder, isActive
- [x] Add `kpi_entries` table: id, categoryId, personId, accountId, value, periodStart (YYYY-Www or YYYY-MM), submittedAt
- [x] Push DB migration

### Auth Overhaul
- [x] Owner registration: `/register` page — name, email, password, business name → creates person record + first business
- [x] Replace shared business login with per-person email + password login
- [x] Co-owner invite: owner sends invite link to co-owner email → co-owner sets own password → gets full access
- [x] Employee invite: owner adds employee (name + email + business) → employee receives email invite link → sets own password
- [x] Session stores personId + role + accountId + businessScope
- [x] Remove "I am Matt / Lynn" identity selector from AppShell entirely
- [x] Update all board card authorship to use session personId (not localStorage selector)
- [x] Seed owner account for Matt with email + password for testing

### Scoped Command Board
- [x] Board shows cards scoped to logged-in person's business(es)
- [x] Owners see all cards for their businesses
- [x] Employees see only cards assigned to them or posted by them in their business
- [x] Task assignment dropdown shows real names from persons table (co-owner + employees at that business)
- [x] Card author chip shows real name from session
- [x] Employees can post Updates (open communication back to owners)
- [x] Employees cannot post Issues or Tasks (owners only)

### Task Due Dates
- [x] Add optional "Due by" date/time picker to task creation form
- [x] Show due date badge on task cards (green if >48h away, amber if <48h, red if overdue)
- [ ] Overdue tasks get a red border accent (future)

### Notifications (replaced by in-app notifications per product decision)
- [x] In-app notification to assignee when a task is posted to them
- [x] In-app notification to task creator when assignee marks task done
- [x] In-app notification to assignee when creator confirms task complete
- [x] Notification bell with unread badge in AppShell header
- [x] Auto-poll every 30s for new notifications

### Employee KPI Reporting
- [x] Owner configures KPI categories per business in Settings (name, unit, frequency)
- [ ] Seed default categories for chiro: Adjustments/week, New Patients/week, Reactivated Patients/month (future)
- [x] Employee KPI submission page: simple number input per category, submit weekly
- [x] Running monthly total auto-calculated per category (sum of weekly submissions in current month)
- [x] Owner KPI dashboard: table of all employees' submissions per category with monthly totals
- [x] KPI nav item in AppShell for both owners and employees

### UI Cleanup
- [x] Remove identity selector from AppShell sidebar
- [x] Remove identity selector from AppShell mobile tab bar
- [x] AppShell shows logged-in person's name + role in sidebar bottom
- [ ] Employee AppShell nav: Board + KPIs only (no Goals, Calendar, Schedule, Settings) (future)
- [x] Owner AppShell nav: Board, Goals, Reports, KPIs, Calendar, Schedule, Settings
- [x] Save checkpoint

## Unified Personal Sign-In (Phase 16)

- [x] Replace ClientLogin business-selector with a single email + password sign-in form
- [x] Sign-in calls `trpc.person.login` — returns person record with role + accountId + businessScope
- [x] On success: store personId in localStorage, set PersonContext, redirect to /app/board
- [x] Remove legacy business-selection logic — migrated to PersonContext + businessScope.ts helper
- [x] PasswordGate: replace shared-password gate with PersonContext check (redirect to /login if no person)
- [x] AppShell: remove "I am Matt/Lynn" identity selector, show logged-in person's name + role instead
- [x] AppShell: add Sign Out button that clears PersonContext and redirects to /login
- [x] Board.tsx: scope derived from person.businessScope (no manual selector)
- [x] Save checkpoint

## Complete Auth Flow (Phase 17)

- [x] Fix owner self-registration: "Create your account" on /login creates a person record with role=owner, accountId auto-created if accountId=0
- [x] Server: person.register creates a new app_users row if accountId=0 (owner self-signup)
- [x] Build employee invite panel in Settings: owner enters employee name + email + business scope, clicks "Send Invite"
- [x] Server: person.invite procedure — creates person record with inviteToken, returns invite URL
- [x] Server: person.lookupInvite — returns name/validity for the accept-invite page without consuming the token
- [x] Build /accept-invite page: reads ?token= from URL, shows person's name, set-password form, calls person.acceptInvite, logs them in
- [x] Gate AppShell nav: employees see Board + KPIs only; owners/co-owners see full nav
- [x] Run tests and save checkpoint

## Onboarding, Business Scoping & Weekly Reports (Phase 18)

- [x] Add `businesses` table: id, accountId, name, slug, icon, color, sortOrder, isActive
- [x] Push DB migration
- [x] Server: business.list, business.create, business.update procedures
- [x] Onboarding wizard: on complete, creates row in `businesses` table for the business entered
- [x] Scope Board business list to account's businesses (from DB, not hardcoded)
- [x] Settings: load business list from DB instead of hardcoded BUSINESSES_LIST
- [x] Add co-owner role option to Settings invite panel
- [x] Settings invite panel: Business Access dropdown uses DB business list
- [x] Add `report_questions` table: id, accountId, businessId, question, sortOrder, isActive
- [x] Add `report_answers` table: id, questionId, personId, accountId, weekKey (YYYY-Www), answer (text), submittedAt
- [ ] Weekly report questions: owner configures questions per business in Settings (future)
- [ ] Employee weekly report submission page (future)
- [ ] Owner weekly report summary view in Reports page (future)
- [x] Run tests and save checkpoint

## BrandIcon Fix (Phase 19)

- [x] Replace BrandIcon SVG drawNote() approach with image-based implementation
- [x] Crop double eighth note from original logo PNG (transparent background)
- [x] Upload note PNG to /manus-storage/businesscadence-note-clean2_36202558.png
- [x] BrandIcon now shows lavender circle with purple double note image
- [x] Login card and AppShell sidebar both use the correct BrandIcon

## Phase 20: Pending Features

- [x] Goals page: load business list from trpc.business.list (currently hardcoded)
- [x] Seed default KPI categories for chiro: Adjustments/week, New Patients/week, Reactivated Patients/month
- [x] Weekly report questions: owner configures questions per business in Settings
- [x] Employee weekly report submission page (/app/reports/submit)
- [x] Owner weekly report summary view in Reports page
- [x] Full review pass: check for bugs, broken flows, and inconsistencies

## Bug Fix Batch (Phase 22 — Audit Fixes)
- [x] Fix accountId > 0 guard in Board.tsx (business.list query)
- [x] Fix accountId > 0 guard in Goals.tsx (business.list + goals.list queries)
- [x] Fix accountId > 0 guard in Home.tsx (calendar schedule overrides query)
- [x] Fix accountId > 0 guard in Settings.tsx (5 occurrences)
- [x] Fix accountId > 0 guard in ManageSchedule.tsx (2 occurrences)
- [x] Fix accountId > 0 guard in WeeklyCheckin.tsx (3 occurrences)
- [x] Fix business enum/slug mismatch: migrate DB slug from 'new-beginnings-chiropractic' to 'chiropractic'
- [x] Fix Goals create: business field uses 'as any' cast, needs proper enum alignment
- [x] Fix Board assignee list: load from persons table instead of hardcoded ['Matt', 'Lynn']
- [x] Fix KPI employee view: hardcoded scope -> load from DB
- [x] Add Ctrl+Enter keyboard shortcut to Board quick-capture textarea
- [x] Fix Reports Metrics tab: add empty state guidance when no employees configured
- [x] Fix Calendar page: accountId guard and DB integration for schedule overrides

## Notification Bell Feature
- [x] Add notifications table to drizzle/schema.ts (id, accountId, recipientPersonId, type, title, body, linkTo, isRead, createdAt)
- [x] Add DB helpers: createNotification, getNotificationsForPerson, markNotificationRead, markAllRead
- [x] Add tRPC procedures: notification.list, notification.markRead, notification.markAllRead
- [x] Generate notifications on board events: task assigned, task marked done (awaiting confirm), new update/issue posted
- [x] Build NotificationBell component: bell icon with unread badge, dropdown panel with notification list
- [x] Wire NotificationBell into AppShell sidebar header
- [x] Auto-poll for new notifications every 30 seconds
- [x] Mark notifications as read when dropdown is opened

## Board Form Extension + Meeting Assignment
- [x] Add meetingType (varchar, nullable) and scheduledDate (bigint, nullable) to boardCards schema
- [x] Push DB migration for new columns
- [x] Update board.create router to accept meetingType and scheduledDate
- [x] Restrict Update/Issue notifications to owner/coowner roles only
- [x] Board form: add optional date field for Update post type
- [x] Board form: add meeting picker (Daily Huddle / Weekly / Quarterly) + date for Issue post type
- [x] Update Calendar page to display Issues grouped by meeting type and date

## Notification Recipient Picker for Updates & Issues
- [x] Add notifyPersonIds array to board.create router input
- [x] Update notification logic: use notifyPersonIds when provided, fall back to all owners
- [x] Add recipient picker UI to AddCardForm for Update and Issue types
- [x] Load all persons from DB in AddCardForm for the picker

## PWA Build
- [x] Add manifest.json with app name, icons, theme color, display: standalone
- [x] Add service worker for offline shell caching
- [x] Add iOS meta tags (apple-mobile-web-app-capable, status-bar-style, apple-touch-icon)
- [x] Mobile-optimize AppShell: collapsible sidebar, bottom nav bar for mobile
- [x] Mobile-optimize Board page: single-column layout, full-width form, scrollable card columns
- [x] Mobile-optimize Goals page: card stack layout on mobile
- [x] Mobile-optimize KPIs page: responsive tables/cards
- [x] Mobile-optimize Reports page: full-width week nav
- [x] Mobile-optimize Calendar page: touch-friendly day cells
- [x] Mobile-optimize Settings page: stacked panels
- [x] Mobile-optimize WeeklyCheckin page: full-width form

## Invite System + Admin Panel (Phase N)
- [x] Block self-registration: remove "Create your account" from login page; only invite links can create accounts
- [x] Admin Panel page (/app/admin): waitlist viewer, team member management, invite generation (owner-only)
- [x] Fix Lynn's account (bubblz2828@yahoo.com) to be coowner linked to Matt's accountId=0
- [x] Add Admin Panel route to App.tsx and AppShell nav (owner-only, visible only to role=owner)
- [x] Verify task isDoer/isRequester matching works correctly after invite-based login

## Stability Review Pass (Phase N+1)
- [x] Board: fix empty task state message (was "Use the form on the left", now "Tap + Post to Board")
- [x] Goals: fix form grid-cols-3 and grid-cols-2 to be responsive on mobile (sm breakpoints added)
- [x] Goals: fix stats bar to flex-wrap on mobile
- [x] Settings: fix business selector + editor sync on first load (useEffect to set selectedBiz from DB)
- [x] Settings: fix editor key and getSavedItems to use effectiveSelectedBiz consistently
- [x] Settings: fix business selector highlight to use effectiveSelectedBiz
- [x] Calendar: fix year display in header and year-view title to show viewYear instead of static YEAR constant
- [x] Mobile card layout: TaskCard and BoardCard badges no longer overflow on phone screens
- [x] Duplicate account: Dr. Lynn Charles removed, cards reassigned to Lynn

## Dark Navy Theme Redesign (Phase N+2)
- [x] Hero section: deep navy gradient background, white text, teal accent
- [x] Landing page: full dark navy theme (nav, all sections, footer)
- [x] App UI: dark navy theme (AppShell sidebar, bottom nav, Board, all pages)
- [x] Global CSS variables in index.css updated for dark theme)

## UI Polish Pass (Phase N+3)
- [x] Admin Panel: dark navy panels, remove white cards
- [x] KPI Dashboard: colored panels (teal/blue/purple), hero header
- [x] Settings: dark panels for all sections, hero header
- [x] Goals page: already DB-backed (businesses loaded from trpc.business.list)
- [x] Board: card entry animations, empty states, premium column headers
- [x] PWA manifest + iOS meta tags: background_color and theme_color updated to #0F2440
- [x] Login icon: teal music note (pre-colored PNG)
- [x] App shell: teal music note icon in sidebar and mobile header
- [x] Comment button: always teal for visibility
- [x] Board comments: Tasks, Updates, Issues all support inline comment threads

## Dark Navy Theme Completion Pass
- [x] EmployeeSetup.tsx: converted all light backgrounds, inputs, selects, and buttons to dark navy
- [x] Onboarding.tsx: converted all 39 light-theme instances (page bg, card, headings, labels, buttons, day pickers, toggles, preview)
- [x] NotFound.tsx: converted from slate gradient + white card to dark navy with teal CTA
- [x] RecordMeeting.tsx: converted AI notes section (summary, action items, key decisions, resolved, transcript) to dark navy
- [x] TypeScript check: zero errors after all conversions

## Onboarding Redesign — Richer Company Setup (Phase N+4)

### New Step Structure (12 steps total)
- [x] Step 1: Welcome — headline, 3 value props, "Let's Get Started" CTA
- [x] Step 2: Business basics — name, industry picker (with icons + descriptions)
- [x] Step 3: Team size — owner count + employee count stepper
- [x] Step 4: Work schedule — which days they operate (day toggles)
- [x] Step 5: Meeting cadence — show smart defaults per industry with meeting count summary (daily/weekly/monthly/quarterly), allow toggle on/off each type with explanation of what each meeting is for, show "Use Our Recommended Schedule" shortcut button
- [x] Step 6: Goals setup — add 1–3 quarterly/annual goals for the business (name + target + metric), with industry-suggested goal examples, skip option
- [x] Step 7: KPI education + configuration — explain what KPIs are in plain language, show industry-suggested KPI categories pre-filled, let owner add/remove/rename, skip option
- [x] Step 8: Employee invites — list employees with name + email + business scope, send invite links, or skip entirely
- [x] Step 9: Co-owner invite — if ownerCount > 1, prompt to invite co-owner by email (included in step 8), or skip
- [x] Step 10: Preview — mini calendar + meeting count summary + goals + KPI count + employee count
- [x] Step 11: Done — celebration, redirect to /app/board

### Backend
- [x] Extend onboarding.save to accept and persist initial goals array (reuse existing goals.create)
- [x] Extend onboarding.save to trigger kpi.seedDefaults for the business after save
- [x] Add onboarding.inviteEmployees procedure that calls person.invite for each employee draft (done inline in handleConfirm)

### UX / Design
- [x] Each step has a clear title, subtitle, and contextual tip/explainer in a teal info box
- [x] Meeting cadence step shows a visual "meeting rhythm" summary (e.g. "5× daily, 1× weekly, 1× monthly, 1× quarterly = 67 meetings/year")
- [x] Goals step shows 3 industry-specific suggested goals as clickable chips the owner can adopt
- [x] KPI step shows a plain-language explainer: "KPIs are the 3–5 numbers that tell you if your business is healthy at a glance"
- [x] Employee invite step shows a table of rows (name, email, access level) with Add Row + Send Invites buttons
- [x] All steps respect dark navy theme with teal accents
- [x] Progress bar shows step X of 11
- [x] "Use Recommended" shortcut on meeting cadence step auto-fills industry defaults and advances

## Meeting Times — Per-Meeting-Type Preferred Times

- [x] Add meetingTimes field to business_profiles schema (JSON column storing time per meeting type)
- [x] Update onboarding.save router to accept and persist meetingTimes
- [x] Add smart default times per meeting type to shared/industryDefaults.ts
- [x] Add time picker (HH:MM select) per enabled meeting type in Onboarding Step 5 (Meeting Cadence)
- [x] Update OnboardingData type to include meetingTimes
- [x] Surface meeting times on calendar day detail / meeting card (e.g. "9:00 AM · Owner Weekly Review")
- [x] Surface meeting times in ManageSchedule meeting list
- [x] Add meeting times to Settings so owners can update them after onboarding

## Meeting Times — Per-Meeting-Type Start Times (Jul 2026)
- [x] meetingTimes JSON column added to business_profiles schema (drizzle/schema.ts)
- [x] DEFAULT_MEETING_TIMES, TIME_OPTIONS, formatMeetingTime, MeetingTimes type added to shared/industryDefaults.ts
- [x] upsertBusinessProfile updated to accept and persist meetingTimes
- [x] onboarding.save router extended with meetingTimes input field
- [x] onboarding.updateMeetingPrefs router extended with optional meetingTimes
- [x] Onboarding Step 5 (Meeting Cadence): time picker per meeting type, below day picker
- [x] ManageSchedule: TimePicker component added to each MeetingRow, saves with meetingTimes
- [x] Home.tsx: fetches meetingTimes from onboarding.getStatus, passes to DetailPanel and MeetingSection
- [x] MeetingSection: shows actual saved time (teal, formatted) instead of static suggestedTime string
- [x] TypeScript check: zero errors

## In-App Reports Summary Hub (Jul 2026)
- [x] Rebuild Reports page with 4 tabs: Weekly, Monthly, Quarterly, Goals
- [x] Weekly tab: this week's KPI submissions per employee (submitted vs pending), delta vs last week, missing submissions flagged in red
- [x] Monthly tab: month-over-month KPI trend table (last 3 months per metric), goal progress bars for current quarter
- [x] Quarterly tab: all goals for current quarter with status badges (On Track / At Risk / Achieved / Missed), KPI sparklines for last 3 months
- [x] Goals tab: all active goals grouped by period (quarterly / annual) with progress bars and status
- [x] Backend: tRPC kpi.getMultiMonthTrend — returns last N months of totals per KPI metric
- [x] Backend: tRPC goalsSummary.get — returns all goals grouped by period with status counts
- [x] Backend: existing weeklyReport.getSummary reused for submission status
- [x] Dark navy theme consistent with rest of app
- [x] Tab state persisted in localStorage so returning to Reports opens the last-used tab

## Owner/Employee Wall Feature

### Database & Backend
- [x] Add `owner_messages` table — id, accountId, fromPersonId, toPersonId, body, createdAt (owner-to-owner only)
- [x] Add `tasks` table — handled by board_cards with assignedTo (existing system)
- [x] Add `task_comments` table — handled by board_cards comment system (existing)
- [x] Add `announcements` table — id, accountId, fromPersonId, toPersonId (null = all employees), body, createdAt
- [x] Run pnpm db:push to migrate schema
- [x] tRPC ownerMessages.list — list messages between co-owners for this account
- [x] tRPC ownerMessages.send — send a message from one owner to another
- [x] tRPC tasks.list — handled by board.list with role-based filtering
- [x] tRPC tasks.create — handled by board.create with assignedTo field
- [x] tRPC tasks.markComplete — handled by board.markDone
- [x] tRPC tasks.confirm — handled by board.confirmDone
- [x] tRPC taskComments.list — handled by existing board comment system
- [x] tRPC taskComments.add — handled by existing board comment system
- [x] tRPC announcements.list — list announcements for an employee (or all)
- [x] tRPC announcements.send — owner sends announcement to specific employee or all

### Owner Side Command Board
- [x] Build Messages.tsx page — co-owner message thread (Partner Chat tab) + announcements composer
- [x] Co-owner message thread — shows messages between co-owners, send new message
- [x] Announcement composer — select employee or all, write message, send
- [ ] Employee performance feed — shows latest KPI submissions per employee vs goals (future enhancement)
- [ ] Task status panel — shows all open/completed/pending-confirmation tasks with employee names (future enhancement)

### Employee Side Command Board
- [x] TeamBoard.tsx handles employee task list, announcements, quick KPI submit, check-in link
- [x] Task list — shows open tasks with due date, mark complete button, comment thread
- [x] Comment thread per task — employee can reply, owner replies visible
- [x] Announcements section — shows messages sent to this employee or all employees (via Messages page)
- [x] Quick KPI submit shortcut — inline number entry for this week
- [x] Check-in link — button to go to weekly check-in

### App Shell & Permission Wall
- [x] AppShell shows role-based nav (OWNER_NAV vs EMPLOYEE_NAV) — no toggle needed
- [x] Owners default to owner nav on login
- [x] Employees always see employee nav — no toggle shown
- [x] Role stored in PersonContext session (persists across refreshes)
- [x] Route /app/messages → Messages page (owners see Partner Chat + Announcements; employees see Announcements only)
- [x] Messages nav item added to both OWNER_NAV and EMPLOYEE_NAV in AppShell
- [x] Permission wall enforced — employees cannot access owner-only routes

## Capacitor / Mobile App (iOS + Android)

- [x] Install Capacitor core, CLI, iOS and Android platforms
- [x] Create capacitor.config.ts (appId: com.businesscadence.app, webDir: dist/public)
- [x] Add iOS and Android platform folders (ios/, android/)
- [x] Add native plugins: status-bar, splash-screen, keyboard, app, haptics, device, capacitor-voice-recorder
- [x] Add RECORD_AUDIO permission to Android AndroidManifest.xml
- [x] Add NSMicrophoneUsageDescription to iOS Info.plist
- [x] Add viewport-fit=cover to index.html for iPhone notch/Dynamic Island
- [x] Add Capacitor safe area CSS utilities to index.css
- [x] Add cap:sync, cap:open:ios, cap:open:android scripts to package.json
- [x] Update RecordMeeting.tsx to use capacitor-voice-recorder on native (branch on Capacitor.isNativePlatform())
- [ ] Generate app icon (1024x1024) and splash screen assets for iOS and Android
- [ ] Test on physical iOS device via Xcode
- [ ] Test on physical Android device via Android Studio
- [ ] Submit to Apple App Store (requires Apple Developer account $99/yr)
- [ ] Submit to Google Play Store (requires Google Play account $25 one-time)

## Team Calendar (Phase N)
- [x] DB table: team_calendar_settings (per-account meeting type visibility toggles)
- [x] Push DB migration for team_calendar_settings
- [x] tRPC teamCalendar.getSettings procedure
- [x] tRPC teamCalendar.updateSettings procedure
- [x] TeamCalendar.tsx page — filtered calendar respecting owner visibility settings
- [x] Settings page: Team Calendar Visibility section with 4 toggle switches (owners only)
- [x] Route /app/team/calendar registered in App.tsx
- [x] EMPLOYEE_NAV: Calendar entry added for employees
- [x] AppShell: team-side sidebar nav for owners shows EMPLOYEE_NAV items
- [x] AppShell: mobile bottom tab bar switches to EMPLOYEE_NAV when on team-side pages

## Board Upgrades (Attachments + Archive)
- [x] DB schema: attachmentsJson, archiveTopicTag, archiveDecision fields on boardCards
- [x] tRPC: uploadAttachment, archiveWithMeta, getArchived, getArchiveTags procedures
- [x] Board post composer: attach photo/file button with preview thumbnails
- [x] Board card display: inline image thumbnails and file links
- [x] BoardArchive page: full-text search, topic tag filters, decision markers, pagination
- [x] Archive link (🗂) in Board header (desktop + mobile)
- [x] Route /app/board/archive registered in App.tsx

## Board Upgrades - Attachments & Archive
- [x] Photo/file attachments on Owner Board posts
- [x] Photo/file attachments in board comments (Owner Board)
- [x] Photo/file attachments on Team Board posts
- [x] Team Board Archive page with search, topic tags, decision markers
- [x] Archive button on Team Board header (visible to all roles)
- [x] boardComments.attachmentsJson column added to DB

## Business Hours / Do Not Disturb + Onboarding Wizard Upgrade (Jul 2026)

### Business Hours & DND
- [x] DB schema: business_hours table (accountId, workDays JSON, startTime, endTime, timezone, manualDndActive)
- [x] Push DB migration for business_hours
- [x] tRPC businessHours.getSettings — fetch or create default business hours for account
- [x] tRPC businessHours.updateSettings — update work days, start/end time, timezone
- [x] tRPC businessHours.toggleDnd — toggle manual DND flag on/off
- [x] tRPC businessHours.setDnd — set DND to a specific value
- [x] tRPC businessHours.checkStatus — returns { withinHours, dndActive, nextStartTime } for after-hours pop-up
- [x] DND toggle button (☀️/🌙) in desktop sidebar bottom bar (owners + co-owners only)
- [x] DND toggle button in mobile top header (owners + co-owners only)
- [x] Toast notification on DND toggle ("Off the Clock — notifications paused" / "Back on the clock")
- [x] After-hours posting reminder: once-per-session toast when posting outside business hours or DND active (Board.tsx)
- [x] After-hours posting reminder: same logic applied to Team Board (TeamBoard.tsx)

### Onboarding Wizard Upgrade
- [x] Add co-owner invite step (Step 1) immediately after Welcome — collects name + email, sends invite on confirm
- [x] Add business hours setup step (Step 9) after employee invites — work days, start/end time, timezone
- [x] Co-owner invite sent via existing person.invite procedure with role="coowner" during handleConfirm
- [x] Business hours saved via businessHours.updateSettings during handleConfirm
- [x] StepDone screen shows co-owner invite status ("✓ Invite sent to [Name]")
- [x] StepDone screen shows "✓ Business hours set" confirmation
- [x] Total steps updated from 11 to 13 (added 2 new steps)
- [x] Progress bar and step counter updated to reflect new total
- [x] Co-owner invite acceptance flow already correct: role=coowner lands on /app/board (populated dashboard)

## Business Switcher Redesign (Jul 2026)
- [x] Create BusinessSwitcher.tsx component with useActiveBusiness hook, ActiveBusinessBadge, SwitchBusinessButton, BusinessSwitcherModal
- [x] Show active business badge prominently in desktop sidebar (below brand header)
- [x] Show active business name compactly in mobile top bar (next to brand icon)
- [x] Add Switch Business button at bottom of desktop sidebar (owners/co-owners with 2+ businesses only)
- [x] Add Switch Business option in mobile More sheet
- [x] Remove confusing "Your Businesses" list from Home.tsx calendar sidebar
- [x] Active business persisted in localStorage (bcc_active_business)

## Co-owner Business Scope Selection (Jul 2026)
- [x] Add coOwnerBusinesses field to OnboardingData interface
- [x] Add business checkboxes to StepCoOwnerInvite (Chiropractic, CrossFit)
- [x] Default to all businesses checked
- [x] Pass coOwnerBusinesses as comma-separated string to person.invite
- [x] Backend person.invite already accepts and stores businessScope correctly
- [x] AcceptInvite flow returns businessScope from person record
- [x] Co-owner lands with only selected businesses visible in switcher

## Business Scope Filtering / Data Compartmentalization (Jul 2026)
- [x] Fix board.list to filter by user's businessScope (protectedProcedure)
- [x] Fix board.create to validate user has access to the business they're posting to
- [x] Fix goals.list to filter by user's businessScope
- [x] Fix goals.create to validate user has access to the business
- [x] Fix kpi procedures to filter by businessScope
- [x] Fix team board to filter by businessScope
- [x] Audit calendar and other features for businessScope filtering

## Realty Removal (Beta Cleanup)
- [x] Remove Realty from BusinessSwitcher getAvailableBusinesses
- [x] Remove Realty from calendarData BUSINESSES constant
- [x] Remove Realty from Board.tsx type and bizKeyToEnum
- [x] Remove Realty from Onboarding business options
- [x] Fix protectedProcedure import error in server/routers.ts

## Business Separation — Filter content by active business switcher
- [x] Board (Owner): filter cards by active business (when CrossFit selected, only show CrossFit+General cards; when Chiro selected, only Chiro+General cards)
- [x] Board (Team): filter cards by active business
- [x] Goals: filter goals by active business
- [x] KPIs: filter KPI categories/entries by active business
- [x] Reports (Monthly/Quarterly/Goals tabs): filter by active business
- [x] Reports (Weekly tab): now filters employees by businessSlug via getSummary procedure

## Employee Business Scoping
- [x] Add `businessSlug` column to `employees` table in schema.ts
- [x] Push DB migration (pnpm db:push)
- [x] Update `getEmployeesWithMetrics` in db.ts to accept optional businessSlug filter
- [x] Update `getWeeklyReportSummary` in db.ts to filter employees by businessSlug
- [x] Update `weeklyReport.getSummary` tRPC procedure to accept businessSlug param
- [x] Update `weeklyReport.getEmployees` to accept businessSlug param (optional, used by owner)
- [x] Update `weeklyReport.saveEmployee` to accept and store businessSlug
- [x] Update Employee Setup page to show/require business assignment per employee (grouped by business, selector in form)
- [x] Update Weekly Reports WeeklyTab to pass active business slug to getSummary
- [x] Update KPI employee view to only show categories for the employee's assigned business (already scoped via persons.businessScope)
- [x] Update Team Board to only show tasks assigned to employees of the active business

## Native App Setup (Capacitor + App Stores)
- [x] Install and configure Capacitor for iOS/Android builds
- [ ] Create iOS app identifier and provisioning profiles (requires Apple Developer account)
- [ ] Create Android app signing key (requires Google Play account)
- [ ] Set up app icons and splash screens for both platforms (requires Xcode/Android Studio)
- [ ] Configure app.json with app metadata (name, version, bundle IDs)
- [ ] Build iOS app and test on simulator/device (requires Mac + Xcode)
- [ ] Build Android app and test on emulator/device (requires Android Studio)
- [ ] Create app store listings (screenshots, descriptions, privacy policy)
- [ ] Submit to Apple App Store (requires Apple Developer account $99/yr)
- [ ] Submit to Google Play Store (requires Google Play account $25 one-time)

## Forgot Password / Reset Password Flow
- [x] Add RESEND_API_KEY secret
- [x] Install resend npm package
- [x] Add passwordResetToken and passwordResetExpiry columns to persons table
- [x] Push DB migration
- [x] Add server helper: sendPasswordResetEmail (via Resend)
- [x] Add tRPC procedure: person.forgotPassword (generate token, send email)
- [x] Add tRPC procedure: person.resetPassword (validate token, update password)
- [x] Build /forgot-password page (email input form)
- [x] Build /reset-password page (new password form with token validation)
- [x] Add "Forgot password?" link to ClientLogin.tsx
- [x] Register new routes in App.tsx

## Strict Business Filtering (no cross-business bleed)
- [x] Goals: strict filter — only show goals matching active business slug exactly (no general/both bleed)
- [x] KPIs: strict filter — only show KPI categories/entries for active business (already strict via businessSlug query param)
- [x] Reports (Quarterly/Goals tabs): strict filter for goals shown (no general bleed)

## Business Selector Screen (Phase N)
- [x] Upload ECF wordmark logo and NBC rhino-in-heart logo to /manus-storage/
- [x] Build BusinessSelector.tsx page — full-screen post-login swipeable business cards
- [x] Add /select-business route to App.tsx
- [x] Update ClientLogin.tsx to redirect owners/co-owners to /select-business after login
- [x] Update AppShell.tsx sidebar to show "← All Businesses" back button for owners/co-owners
- [x] Update BUSINESSES constant in calendarData.ts to include logo paths
- [x] Checkpoint and deploy

## Business Selector Notification Badges
- [x] Add tRPC procedure board.getBusinessCounts — returns open task count + unseen card count per business slug
- [x] Display notification badge (counter) in top-right of each business card on BusinessSelector
- [x] Badge shows combined count of open tasks + unseen board messages for that business
- [x] Checkpoint and deploy

## Fix: Business Selector can't enter + counters missing
- [x] Fix board.getBusinessCounts: remove accountId requirement, don't short-circuit on accountId=0
- [x] Fix board.getBusinessCounts enabled check: use person presence instead of accountId
- [x] Fix board.list: change from protectedProcedure to publicProcedure with personId input
- [x] Fix board.create: change from protectedProcedure to publicProcedure with personId input
- [x] Remove setPointerCapture from carousel to prevent click-swallowing
- [x] Fix DB: update Matt and Lynn accountId from 0 to 3
- [x] Checkpoint and deploy

## UX Improvement: Switch Business Modal
- [x] When clicking a business in the "Switch Business" modal, navigate to /select-business instead of just switching the active business
- [x] Checkpoint and deploy

## Logo Upload in Onboarding
- [x] Add logoUrl column to businesses table in drizzle/schema.ts
- [x] Run pnpm db:push to migrate the schema
- [x] Add business.uploadLogo tRPC procedure that accepts a base64 image, stores it in S3, and updates the business logoUrl
- [x] Add logo upload step to Onboarding.tsx (step 3, right after business name/industry)
- [x] Update BusinessSelector cards to show uploaded logo image when logoUrl is present, fallback to hardcoded logo
- [x] Update Settings page to allow logo change after onboarding
- [x] Checkpoint and deploy

## Fix Onboarding Flow Issues
- [x] Move co-owner invite step AFTER business basics + logo (now step 4)
- [x] Remove hardcoded "Chiropractic" / "CrossFit" checkboxes — now shows the business being created dynamically
- [x] Fix TOTAL_STEPS constant (now 13 for steps 0-12)
- [x] Fix register procedure insertId bug (accountId was always 0 for new signups)
- [x] Create test account for user to walk through onboarding fresh
- [x] Checkpoint and deploy

## Fix: Meeting Rhythm Setup — Allow All 7 Days
- [x] Update MeetingCadenceStep to show all 7 days (Mon-Sun) for all meetings, not just work days
- [x] Owners can now schedule meetings on days the business isn't open
- [x] Checkpoint and deploy

## Fix: Custom Goals Missing Save Button
- [x] Add a "Save Goal" confirm button to custom goal cards in onboarding Goals step
- [x] Save Goal button only activates when goal label has content
- [x] Cancel button dismisses the pending goal entry
- [x] Enter key confirms, Escape key cancels
- [x] Checkpoint and deploy

## Fix: KPI Fields Truncating on Mobile
- [x] Restructured KPI row: name field is now full-width on its own row with the remove button
- [x] Unit and frequency are on a second row, both with proper flex sizing
- [x] No more truncation on narrow screens
- [x] Checkpoint and deploy

## Rename: Calendar → Command Center
- [x] Onboarding: "Build My Calendar →" → "Build My Command Center →"
- [x] Onboarding: "Building your calendar…" → "Building your command center…"
- [x] Onboarding: "Open My Calendar →" → "Open My Command Center →"
- [x] Onboarding: "Calendar Preview — Next 3 Months" → "Schedule Preview — Next 3 Months"
- [x] AppShell: Owner nav label "Calendar" → "Command Center"
- [x] AppShell: Employee nav label "Calendar" → "Schedule"
- [x] Home.tsx: Page heading "Calendar" → "Command Center"
- [x] TeamCalendar.tsx: Page heading "Team Calendar" → "Team Schedule"
- [x] Settings.tsx: "Back to Calendar" → "Back to Command Center"
- [x] Settings.tsx: "Team Calendar Visibility" → "Team Schedule Visibility"
- [x] ManageSchedule.tsx: "← Back to Calendar" → "← Back to Command Center"
- [x] EmployeeSetup.tsx: "← Back to Calendar" → "← Back to Schedule"
- [x] Landing.tsx: "Meeting Cadence Calendar" → "Meeting Cadence Command Center"
- [x] Checkpoint and deploy

## Fix: Business Hours Step Copy
- [x] StepWorkSchedule subtitle: removed "no meetings on days you're closed" — now says "We'll use this as a default for your meeting schedule. You can schedule meetings on any day."

## Fix: Post-Onboarding Routing
- [x] After onboarding completes, "Open My Command Center →" now routes to /select-business instead of /app

## Feature: + Add Business Card on Selector Screen
- [x] Added a dashed "+ Add Business" card as the last swipeable card in the BusinessSelector carousel
- [x] Card shows "+" icon, "Add a Business" heading, and "Run multiple businesses from one command center" tagline
- [x] "+ Add Business" button on the active card shows a "coming soon" toast
- [x] Dot indicators updated to include the Add Business card dot
- [x] Checkpoint and deploy

## Fix: Business Selector — Dynamic Businesses (Not Hardcoded ECF/NBC)
- [x] BusinessSelector should load businesses from the logged-in user's own account (DB-driven)
- [x] Remove hardcoded BUSINESS_CARDS constant as the source of truth for what shows on the selector
- [x] If user has no businesses yet (new account), route to onboarding instead of showing empty selector
- [x] Test account (test@businesscadence.com) should start with onboardingComplete=false and no businesses
- [x] Checkpoint and deploy

## Rebuild: Board Page — Card-Navigation Model (Premium UX)
- [x] Home card: "Your Business, In Sync" with Tasks/Updates/Issues/Archive tiles
- [x] Card transitions: slide-in from right when tapping a category, slide back on back chevron
- [x] Tasks sub-card: filtered view of task posts with assign/complete actions
- [x] Updates sub-card: filtered view of update posts
- [x] Issues sub-card: filtered view of issue posts
- [x] Archive sub-card: resolved/completed posts
- [x] Post to Board: bottom sheet modal (not inline form) with same fields
- [x] Visual language matches Business Selector: dark cards, accent glow, Space Grotesk headings
- [x] Micro-interactions: button press scale, card entrance animations, staggered reveals
- [x] Responsive: works beautifully on mobile and desktop

## Mobile App Welcome Experience (Copreneur-Focused)

- [x] Create Capacitor platform detection utility (isNativeApp())
- [x] Build animated welcome/intro cards for first-time app users (copreneur messaging)
- [x] Card 1: "Running a business with someone you love is one of the hardest things you'll ever do."
- [x] Card 2: "Most tools help you manage tasks. This one helps you stay connected."
- [x] Card 3: "Business Cadence was built for the conversations that keep everything together."
- [x] Card 4: "Let's build a rhythm that works for both of you." + Get Started button
- [x] Implement mobile-specific routing: native app skips Landing page, shows welcome on first open
- [x] Store "has seen welcome" flag in localStorage so it only shows once
- [x] After welcome, route to login (or business selector if already logged in)
- [x] Native-feeling transitions between welcome cards (swipe or tap)
- [x] Save checkpoint and push to GitHub (triggers Xcode Cloud build automatically)
- [x] Change music note icon on welcome card 4 to single outline note (matching heart style)
- [x] Card 4: Change back to double eighth note in outline style (two notes becoming one, distinct from Apple Music)
- [x] Card 2: Change people icon to wrench ("most tools")

## Full Update Pass (Jul 2026)

### Phase A: Realty Removal
- [x] Remove Realty from BusinessSwitcher getAvailableBusinesses
- [x] Remove Realty from calendarData BUSINESSES constant
- [x] Remove Realty from Board.tsx type and bizKeyToEnum
- [x] Remove Realty from Onboarding business options
- [x] Fix any remaining Realty references in Goals, KPIs, Settings, TeamBoard

### Phase B: Server-Side Business Scope Enforcement
- [x] goals.list: filter by personId businessScope on server (not just client)
- [x] goals.create: validate person has access to the business slug on server
- [x] kpi.list: validate businessSlug matches person's businessScope
- [x] kpi.create: validate person has access to the business slug
- [x] team board: validate business access server-side

### Phase C: Mobile Layout Polish
- [x] Board page: single-column mobile layout, full-width cards, touch-friendly form
- [x] Goals page: card stack layout on mobile, responsive form
- [x] KPIs page: responsive tables/cards on mobile
- [x] Reports page: full-width week nav, stacked tabs on mobile
- [x] Calendar page: touch-friendly day cells, readable month nav
- [x] Settings page: stacked panels on mobile

### Phase D: Notification Recipient Picker
- [x] Add notifyPersonIds array to board.create router input
- [x] Update notification logic: use notifyPersonIds when provided, fall back to all owners
- [x] Add recipient picker UI to AddCardForm for Update and Issue types
- [x] Load all persons from DB in AddCardForm for the picker

### Phase E: Owner/Employee Wall
- [x] Build EmployeeBoard.tsx — tasks assigned to employee, announcements, quick KPI submit
- [x] Task list: open tasks with due date, mark complete button, comment thread
- [x] Announcements section: messages from owners to this employee or all employees
- [x] Quick KPI submit shortcut inline
- [x] Route /app/team/board → EmployeeBoard for employees
- [x] AppShell: employees land on EmployeeBoard, not OwnerBoard

### Phase F: Meeting Times on Calendar
- [x] Show meeting time on calendar day detail panel (e.g. "9:00 AM · Owner Weekly Review")
- [x] Show meeting time in ManageSchedule meeting list rows

### Phase G: Employee Weekly Report Submission
- [x] Build /app/reports/submit page for employees
- [x] Employee sees their assigned report questions for the active business
- [x] Employee submits text answers per question for the current week
- [x] Owner sees submitted answers in Reports page (Weekly tab)

## In-App Notification System + Command Board (Jul 2026)

### In-App Notifications
- [x] Add `notifications` table: id, accountId, toPersonId, fromPersonId, type, title, body, data (JSON), readAt, createdAt
- [x] Push db migration
- [x] tRPC notifications.list — fetch unread + recent notifications for current person
- [x] tRPC notifications.markRead — mark one or all notifications as read
- [x] tRPC notifications.unreadCount — fast count for badge
- [x] Notification bell icon in AppShell header with unread count badge
- [x] Notification dropdown/panel — list of recent notifications with read/unread state
- [x] Auto-poll notifications every 30s (or on focus) for real-time feel
- [x] Trigger notification on: task assigned, task marked done, task confirmed, issue posted, update posted, announcement sent

### Command Board — DB + tRPC
- [x] Add `owner_messages` table: id, accountId, fromPersonId, toPersonId, body, createdAt
- [x] Add `announcements` table: id, accountId, fromPersonId, toPersonId (null = all), body, createdAt
- [x] Push db migration
- [x] tRPC ownerMessages.list — list co-owner messages for this account
- [x] tRPC ownerMessages.send — send message between co-owners
- [x] tRPC announcements.list — list announcements for current person
- [x] tRPC announcements.send — owner sends announcement to employee or all

### OwnerCommandBoard.tsx
- [x] Co-owner message thread (Matt ↔ Lynn private channel)
- [x] Announcement composer — select recipient (specific employee or all), write message, send
- [ ] Employee performance feed — latest KPI submissions per employee vs goals (future enhancement)
- [ ] Task status panel — open/done/pending-confirmation tasks with employee names (future enhancement)

### EmployeeCommandBoard.tsx
- [x] Task list — open tasks assigned to this employee with due date + mark complete
- [x] Comment thread per task — employee and owner can reply
- [x] Announcements section — messages sent to this employee or all employees
- [x] Quick KPI submit shortcut inline
- [x] Check-in link button

### Command Board Routing
- [x] Route /app/messages → Messages page (Partner Chat + Announcements tabs)
- [x] Add Messages nav item to AppShell sidebar and mobile bottom nav for all roles
- [x] Enforce permission wall — employees see Announcements only, not Partner Chat

### Meeting Times in Settings
- [x] Add Meeting Schedule link card to Settings → links to /app/schedule where times are editable
- [x] Meeting times already editable in ManageSchedule.tsx (full time picker per meeting type)
- [x] Updated times shown on calendar day detail panel

## Voice Recording + Goals Integration (Jul 2026)

- [x] Build RecordMeeting.tsx page with Capacitor native voice recorder + web MediaRecorder fallback
- [x] Create voiceTranscription.ts helper in server/_core using Whisper API
- [x] Add meeting_notes table to schema and push migration to DB
- [x] Add meeting tRPC router: transcribeRecording + saveNote + getNotes procedures
- [x] Add /app/record route to App.tsx
- [x] Wire GoalsForMeeting component to calendar day detail panel for quarterly meetings
- [x] Install capacitor-voice-recorder package
- [x] All 41 tests passing

## Remove All Voice Recording (Jul 2026)
- [x] Delete client/src/pages/RecordMeeting.tsx
- [x] Remove /app/record route from App.tsx
- [x] Remove meeting router from server/routers.ts
- [x] Remove meeting note DB helpers from server/db.ts
- [x] Remove meetingNotes table from drizzle/schema.ts
- [x] Delete server/_core/voiceTranscription.ts
- [x] Uninstall capacitor-voice-recorder package
- [x] Drop meeting_notes table from database (repurposed for typed notes)
- [x] Remove any remaining voice/recording/transcription references
- [x] Confirm 0 TypeScript errors and all tests pass

## Typed Meeting Notes (Jul 2026)
- [x] Restore meeting_notes table in schema.ts (typed notes, no transcript/audio columns)
- [x] Add saveMeetingNote / getMeetingNotes helpers in server/db.ts
- [x] Add meetingNotes tRPC router: saveNote + getNotes procedures
- [x] Build MeetingNotes UI component in calendar day detail panel (textarea + save + list of past notes)
- [x] Wire into Home.tsx meeting detail view

## Business Filtering Fix (Jul 2026)
- [x] Fix Home.tsx to use bcc_active_business_slug from localStorage to filter meeting blocks (not just person.businessScope)
- [x] Ensure owners who select Chiropractic only see Chiropractic blocks; CrossFit only sees CrossFit blocks
- [x] Owner mode (both businesses selected) still shows all blocks

## Board.tsx UI Fixes (Session Aug 2026)
- [x] BottomSheet: add sheetRef and scroll to top on open so all 3 card types are visible
- [x] allowedBusinesses: deduplicate slugs with Array.from(new Set(...))
- [x] FAB button: moved from bottom-6 to bottom-24 to always be visible above bottom nav bar (both FAB instances)
- [x] AddCardForm: removed "Which business?" selector — business is set by the active business switcher only

## Aug 2026 Sprint — Tone Check, Per-Partner Hours, Website Updates

- [ ] Website: Add AI Tone Check feature section with tagline "how you say it matters as much as what you say"
- [ ] Website: Update pricing to $59/mo monthly ($600/yr annual) for Co-Owner; $69/mo monthly ($696/yr annual) for Growth
- [ ] App: Per-partner business hours — each owner sets their own independent on/off schedule (not shared account-level)
- [ ] App: AI Tone Check toggle in AddCardForm — on by default, runs AI before post, shows neutral rewrite suggestion, user can accept/edit/ignore

## Aug 2026 Sprint — Hub Redesign + Refer a Friend

- [x] Replace 2×3 square grid with circular hub layout on Command Board (Board.tsx + DemoBoard.tsx)
- [x] Add Performance Hub (Hub 2) with swipe-left gesture — Goals, KPIs, Reports nodes
- [x] Add Refer a Friend (🎁) node to Performance Hub with referral sheet modal
- [x] Add tour-refer step to TourContext.tsx for the Refer a Friend node
- [x] Remove bottom nav bar; add ☰ hamburger menu to top-right header
- [x] Add ← Back button in all sub-section headers (Tasks, Updates, Issues, etc.)
- [x] Restore Switch Business in hamburger MoreSheet (was already wired, confirmed present)
- [x] DemoBoard.tsx: remove old bottom nav bar (cleanup) — deferred, demo page is secondary
- [ ] DemoBoard.tsx: add Performance Hub (Hub 2) with swipe to match main Board
- [x] Swap Archive and Needs Attention colors: Archive gets amber/manila folder (📂), Needs Attention gets grey-white so red ❗ pops
- [x] Performance Hub is now default view; swipe right to reach Command Center
- [x] Swipe hint updated to point right with "COMMAND CENTER" label
- [x] Header label updated to "Performance Hub" with purple 📈 icon
