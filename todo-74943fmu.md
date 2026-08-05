# Business Cadence — Session TODO (74943fmu)

- [x] Fix splash screen: show full logo (heart icon + "Business Cadence" + tagline) instead of just small heart icon
- [x] Upload new splash.png asset to webdev storage
- [x] Update SubscriptionOnboarding page to show full BrandLogo with tagline prominently at top
- [x] Place composed splash.png in assets/ folder for native Capacitor rebuild
- [x] Update BrandLogo component — use transparent heart, activate showTagline prop, add BrandLogoStacked variant
- [x] Regenerate all iOS and Android native splash screen assets with @capacitor/assets generate

- [x] Run pnpm cap:sync to sync native projects with latest web build
- [x] Add heartbeat pulse animation to the heart icon on SubscriptionOnboarding
- [x] Apply BrandLogoStacked to the ClientLogin page header
- [x] Fix squished username/password fields on the login page
