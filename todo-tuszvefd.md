# Task 1 — Partner Invite → Onboarding Cards

## Backend
- [x] Extend `generatePartnerInviteLink` to accept and store `businessName` on the invite token
- [x] Update `lookupPartnerInvite` to return `businessName` alongside `ownerName`
- [x] Change generated invite URL from `/accept-invite?...&partner=1` to `/subscribe-intro?...&partner=1`
- [x] Add `subscription.notifyPartnerJoined` mutation — creates in-app notification for the owner when partner completes setup
- [x] Add `"partner_joined"` to the notifications enum in schema + apply migration

## Frontend — /subscribe-intro (SubscriptionOnboarding)
- [x] Detect `?token=...&partner=1` query params on mount
- [x] Fetch business name via `lookupPartnerInvite` when partner token present
- [x] Replace "See Plans →" with "Join [Business Name] →" on the final card
- [x] Skip button in partner mode should go to `/partner-register?token=...` instead of `/paywall`
- [x] On final card CTA click, navigate to `/partner-register?token=...`

## Frontend — /partner-register (new page)
- [x] New page: if already logged in → skip to `/onboarding?partnerToken=...`, else show register/sign-in form
- [x] Register form calls `person.register` with `role: "coowner"` and `accountId` from token lookup
- [x] Sign-in form calls `person.login` (existing users)
- [x] After auth, navigate to `/onboarding?partnerToken=...`

## Frontend — /onboarding (Onboarding)
- [x] Detect `?partnerToken=...` query param
- [x] On completion (`handleConfirm`), call `subscription.notifyPartnerJoined` to notify the owner
- [x] After completion, navigate to `/select-business` (same as normal flow)
- [ ] Pre-fill `businessName` from the token lookup data (deferred — partner enters their own business name in onboarding)

## Frontend — InvitePartnerSetup
- [x] Pass `businessName` field to `generatePartnerInviteLink` mutation
- [x] Also updated `PartnerInviteSheet` (Settings page) to pass `businessName` from business list

## Tests
- [x] Vitest: `lookupPartnerInvite` returns businessName
- [x] Vitest: `notifyPartnerJoined` creates notification for owner
