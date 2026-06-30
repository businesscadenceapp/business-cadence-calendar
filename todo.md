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
