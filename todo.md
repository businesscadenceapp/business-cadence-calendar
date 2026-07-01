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

- [ ] Add app_users table to drizzle schema (username, hashed password, business scope, role)
- [ ] Push DB migration and seed three accounts: chiro/subluxation, crossfit/burpee, owner/lynnandmatt901
- [ ] Update server gate.verify procedure to validate username + password and return scope + session token
- [ ] Update ClientLogin frontend to send username + password and store scope in session
- [ ] Update PasswordGate to use new session token with scope
- [ ] Update calendar app to filter meeting data by business scope from session
- [ ] Test all three accounts in isolation
- [ ] Save checkpoint

## Meeting Recording Feature (Phase 5)
- [x] Add meeting_recordings table to DB schema (meetingId, transcript, aiNotes, actionItems, audioKey, createdAt)
- [x] Push DB migration
- [x] Add server-side tRPC procedure: upload audio → Whisper transcription → LLM processing → save to DB
- [x] Build RecordMeeting UI component: mic button, recording timer, stop, upload progress, AI notes display
- [x] Wire RecordMeeting into the meeting detail/Board view
- [x] Display past recording notes when viewing a meeting that was previously recorded
- [ ] Test full flow end-to-end on desktop and mobile
- [ ] Save checkpoint

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
- [ ] Replace static `calendarData.ts` meeting placement with dynamic schedule from DB — Phase 7
- [ ] Owner toggle button (Owner Mode ↔ Team Mode) — owners only, deferred until Team Layer built

### Known Gaps / Phase 7 Work
- [ ] Replace static `calendarData.ts` calendar rendering in Home.tsx with DB-driven dynamic schedule (so closed-day changes visibly reschedule meetings in the main calendar)
- [ ] Persist meeting reschedule overrides when closed periods affect meetings; surface them via `schedule.getOverrides`
- [ ] Use `trpc.onboarding.getStatus` during app entry to verify onboarding completion from server state (not just localStorage flag)
- [ ] Show a real generated calendar preview in onboarding Step 7 (call `trpc.onboarding.generateCalendar` and render upcoming meetings before confirmation)

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
- [ ] Add `completedAt`, `completedBy`, `confirmedAt`, `confirmedBy` columns to `board_cards` table
- [ ] Add `assignedTo` column to `board_cards` (who the task is assigned to)
- [ ] Push DB migration

### Backend
- [ ] tRPC `board.markDone` — doer marks task as done (sets completedAt + completedBy)
- [ ] tRPC `board.confirmDone` — requester confirms task is done (sets confirmedAt + confirmedBy)
- [ ] Update `board.list` to return completedAt, confirmedAt, assignedTo fields
- [ ] Update `board.create` to accept `assignedTo` for Task type

### Frontend
- [ ] Add "Task" as a third card type (alongside Update and Issue)
- [ ] Task cards show assignee, checkbox for doer to mark done
- [ ] Two-step flow: doer checks off → card moves to "Done — Awaiting Confirmation" section
- [ ] Requester sees "Confirm Done" button → confirms → card moves to collapsed archive
- [ ] Board sections: Active | Done — Awaiting Confirmation | Completed (collapsible)
- [ ] Fix identity selector: persist "I am Matt / Lynn" in localStorage (set once per device)
- [ ] Remove redundant top-right identity selector from board header
- [ ] When posting a Task, show "Assign to:" dropdown (the other owner)

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
