# Subscription & Partner Access System — Session TODO

## Phase 1: Database Schema
- [ ] Add `subscriptions` table (accountId, revenueCatUserId, plan, status, trialEndsAt, currentPeriodEndsAt, revenueCatData)
- [ ] Add `partner_links` table (ownerPersonId, partnerPersonId, accountId, createdAt)
- [ ] Run DB migration via webdev_execute_sql

## Phase 2: Server-Side Subscription Logic
- [ ] Add `subscription.getEntitlement` tRPC procedure — returns { hasAccess, plan, trialDaysLeft, isPartner }
- [ ] Add `subscription.revenueCatWebhook` REST endpoint — handles purchase/renewal/cancellation events
- [ ] Add `subscription.getInviteLink` tRPC procedure — returns unique partner invite URL for paying owner
- [ ] Add `subscription.checkAccess` helper used by entitlement guard
- [ ] Add `subscription.startTrial` tRPC procedure — creates 14-day trial subscription row on first owner login
- [ ] Add ENV.revenueCatWebhookSecret to env.ts

## Phase 3: Partner Invite Flow
- [ ] Add `partnerInvite` token column to `persons` table (separate from regular `inviteToken`)
- [ ] Add `subscription.generatePartnerInvite` procedure — creates/refreshes partner invite token
- [ ] Update `person.acceptInvite` to detect partner invite and link partner to owner's subscription
- [ ] Build `PartnerInviteSheet.tsx` — bottom sheet inside app for owner to share invite link
- [ ] Add "Invite Partner" button to Settings page

## Phase 4: Paywall Screen
- [ ] Build `/paywall` page — native-feeling, 14-day trial CTA, $79/mo Core, $99/mo Core+Team
- [ ] Add route `/paywall` to App.tsx
- [ ] Insert paywall check after onboarding completion (redirect to /paywall if no active sub)
- [ ] Insert paywall check after login for owners/co-owners (redirect to /paywall if no active sub)
- [ ] RevenueCat Capacitor SDK: install @revenuecat/purchases-capacitor
- [ ] Wire RevenueCat SDK initialization in native app startup
- [ ] Wire "Start Free Trial" button to RevenueCat purchase flow on native
- [ ] Wire "Restore Purchases" button

## Phase 5: Entitlement Guard
- [ ] Build `EntitlementGuard.tsx` — wraps PasswordGate, checks subscription.getEntitlement on mount
- [ ] Update `PasswordGate` / `Protected` wrapper in App.tsx to include EntitlementGuard
- [ ] Handle partner access: partners bypass paywall if linked to active subscription
- [ ] Handle lapsed subscription: redirect to /paywall with "Your subscription has lapsed" message
- [ ] Handle trial expiry: redirect to /paywall with "Your trial has ended" message

## Phase 6: Tests
- [ ] Write vitest for subscription.getEntitlement (active, trial, lapsed, partner)
- [ ] Write vitest for partner invite link generation and acceptance
