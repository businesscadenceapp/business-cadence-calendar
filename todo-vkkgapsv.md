# Subscription & Partner Access System — Session TODO

## Phase 1: Database Schema
- [x] Add `subscriptions` table (accountId, revenueCatUserId, plan, status, trialEndsAt, currentPeriodEndsAt, revenueCatData)
- [x] Add `partner_links` table (ownerPersonId, partnerPersonId, accountId, createdAt)
- [x] Run DB migration via webdev_execute_sql

## Phase 2: Server-Side Subscription Logic
- [x] Add `subscription.getEntitlement` tRPC procedure — returns { hasAccess, plan, trialDaysLeft, isPartner }
- [x] Add `subscription.revenueCatWebhook` REST endpoint — handles purchase/renewal/cancellation events
- [x] Add `subscription.getInviteLink` tRPC procedure — returns unique partner invite URL for paying owner
- [x] Add `subscription.checkAccess` helper used by entitlement guard
- [x] Add `subscription.startTrial` tRPC procedure — creates 14-day trial subscription row on first owner login
- [x] Add ENV.revenueCatWebhookSecret to env.ts

## Phase 3: Partner Invite Flow
- [x] Add `partnerInviteToken` column to `persons` table
- [x] Add `subscription.generatePartnerInviteLink` procedure — creates/refreshes partner invite token
- [x] Update `AcceptInvite` page to detect partner invite (?partner=1) and link partner to owner's subscription
- [x] Build `PartnerInviteSheet.tsx` — bottom sheet inside app for owner to share invite link
- [x] Add "Partner Access" section to Settings page (owners only)

## Phase 4: Paywall Screen
- [x] Build `/paywall` page — native-feeling, 14-day trial CTA, $79/mo Core, $99/mo Core+Team
- [x] Add route `/paywall` to App.tsx (already done by other session, merged)
- [x] Update shared/subscriptionPlans.ts with correct $79/$99 Core/Core+Team pricing
- [x] RevenueCat Capacitor SDK: install @revenuecat/purchases-capacitor
- [x] Wire RevenueCat SDK: real purchasePackage() on native, server-side trial on web
- [x] Wire "Restore Purchases" button with RevenueCat restorePurchases()
- [x] Full App Store legal disclosure on Paywall

## Phase 5: Entitlement Guard
- [x] Build `EntitlementGuard.tsx` — wraps PasswordGate, checks subscription.getEntitlement on mount
- [x] Update `Protected` wrapper in App.tsx to include EntitlementGuard
- [x] Handle partner access: partners bypass paywall if linked to active subscription
- [x] Handle lapsed subscription: redirect to /paywall with "Your subscription has lapsed" message
- [x] Handle trial expiry: redirect to /paywall with "Your trial has ended" message

## Phase 6: Tests
- [x] Update paywall.test.ts to match new Core/Core+Team pricing (18 tests pass)
- [x] All 28 tests passing across 5 test files
