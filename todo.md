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
- [ ] Redesign card layout: larger, more breathing room, cleaner visual hierarchy
- [ ] Add owner avatar/color chip to each card (Matt=navy, Lynn=coral) so authorship is instant
- [ ] Make the "Post" button more prominent — primary CTA on the board
- [ ] Improve the Active / Awaiting Confirmation / Completed section headers
- [ ] Add empty state for when the board is clear ("All clear — nothing pending")
- [ ] Smooth card entry animation (slide in from bottom)

### Goals Page
- [x] Audit current Goals page — determine if it exists or needs to be created
- [x] If missing: create Goals page with ability to add/edit quarterly and annual goals per business
- [x] Goals should be visible from the main nav (second position)
- [ ] Link goals to meeting types (quarterly goals shown in quarterly meeting detail)

### Overall Layout Polish
- [ ] First screen after login should feel like a "command center" not a calendar
- [ ] Tighten header height, give main content more vertical space
- [ ] Today's date more prominent in calendar month view
- [ ] Meeting dots slightly larger and more readable on mobile
- [ ] Save checkpoint

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
- [ ] Owner registration: `/register` page — name, email, password, business name → creates person record + first business
- [ ] Replace shared business login with per-person email + password login
- [ ] Co-owner invite: owner sends invite link to co-owner email → co-owner sets own password → gets full access
- [ ] Employee invite: owner adds employee (name + email + business) → employee receives email invite link → sets own password
- [ ] Session stores personId + role + accountId + businessScope
- [ ] Remove "I am Matt / Lynn" identity selector from AppShell entirely
- [ ] Update all board card authorship to use session personId (not localStorage selector)
- [ ] Seed owner account for Matt with email + password for testing

### Scoped Command Board
- [ ] Board shows cards scoped to logged-in person's business(es)
- [ ] Owners see all cards for their businesses
- [ ] Employees see only cards assigned to them or posted by them in their business
- [ ] Task assignment dropdown shows real names from persons table (co-owner + employees at that business)
- [ ] Card author chip shows real name from session
- [ ] Employees can post Updates (open communication back to owners)
- [ ] Employees cannot post Issues or Tasks (owners only)

### Task Due Dates
- [x] Add optional "Due by" date/time picker to task creation form
- [x] Show due date badge on task cards (green if >48h away, amber if <48h, red if overdue)
- [ ] Overdue tasks get a red border accent (future)

### Notifications (Email)
- [ ] Email notification to assignee when a task is posted to them
- [ ] Scheduled job: email reminder to assignee 3 days before due date (if task still open)
- [ ] Scheduled job: email reminder to assignee 2 days before due date (if task still open)
- [ ] Email notification to task creator when assignee marks task done
- [ ] Email notification to assignee when creator confirms task complete

### Employee KPI Reporting
- [x] Owner configures KPI categories per business in Settings (name, unit, frequency)
- [ ] Seed default categories for chiro: Adjustments/week, New Patients/week, Reactivated Patients/month (future)
- [x] Employee KPI submission page: simple number input per category, submit weekly
- [x] Running monthly total auto-calculated per category (sum of weekly submissions in current month)
- [x] Owner KPI dashboard: table of all employees' submissions per category with monthly totals
- [x] KPI nav item in AppShell for both owners and employees

### UI Cleanup
- [ ] Remove identity selector from AppShell sidebar
- [ ] Remove identity selector from AppShell mobile tab bar
- [ ] AppShell shows logged-in person's name + role in sidebar bottom
- [ ] Employee AppShell nav: Board + KPIs only (no Goals, Calendar, Schedule, Settings) (future)
- [x] Owner AppShell nav: Board, Goals, Reports, KPIs, Calendar, Schedule, Settings
- [ ] Save checkpoint

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
