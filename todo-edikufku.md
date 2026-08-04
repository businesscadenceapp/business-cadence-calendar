# Business Cadence - Session TODO (edikufku)

## Pricing Section Updates
- [x] Update Monthly tier from $49/$59 to $69/$79 (Co-Owner $69, Co-Owner+Team $79)
- [x] Add Annual billing toggle with ~25% discount ($52/$59 annual)
- [x] Add Founding Member tier ($39/mo locked, early adopter)
- [x] Add 14-day free trial CTA prominently in pricing section
- [x] Update pricing copy to reflect higher-value positioning
- [x] Update in-app Paywall subscriptionPlans.ts with new plan IDs and pricing
- [x] Update paywall.test.ts to match new plan structure (all 42 tests passing)

## Visual Refinements
- [x] Add warm amber accent color (#F59E0B) for urgency/alerts/overdue items
- [x] Improve card surface differentiation (slightly lighter card bg + more visible border)
- [x] Improve typography hierarchy (bolder h1/h2/h3, lighter body via CSS base layer)
- [x] Apply warm amber to overdue states in Board.tsx, TeamBoard.tsx, NotificationBell.tsx

## Founding Member Spots Counter
- [x] Add founding spots tracking to subscriptions table (plan enum extended)
- [x] Add server procedure to get founding spots count (used / 100)
- [x] Wire live count to landing page Founding Member card badge (progress bar + spots remaining)
- [x] Auto-hide/mark Founding Member tier when 100 spots are filled (badge changes to "Sold Out")

## Beta Tier ($0 Internal Plan)
- [x] Add beta status to subscriptions table (status enum extended with "beta")
- [x] Add beta entitlement logic to checkSubscriptionAccess (beta status = hasAccess: true)
- [x] Add grantBetaAccess and revokeBetaAccess DB helpers
- [x] Add grantBeta and revokeBeta tRPC procedures (admin-only via ownerOpenId check)
- [x] Add Beta Access tab to admin panel with email search, grant/revoke controls, spots counter
- [x] Add person.findByEmail procedure for admin search

## Move Messages → Performance Hub (Co-Owner Inbox)
- [x] Add Co-Owner Inbox node to Performance Hub in Board.tsx (teal 💬, angle -30°)
- [x] Remove Messages from OWNER_NAV in AppShell.tsx
- [x] SVG spokes updated to 6 angles to match all nodes

## Move Settings → Performance Hub
- [x] Add Settings node to Performance Hub in Board.tsx (slate ⚙️, angle -150°)
- [x] Remove Settings from OWNER_NAV in AppShell.tsx
