# Project TODO

- [x] Inspect the restored hub’s center symbols, destination handlers, and notification sleep-mode state.
- [x] Replace the center lightning and graph symbols with compact, consistently sized sun and crescent moon icons.
- [x] Preserve the existing center-circle dimensions and keep the new symbols visually no larger than the prior icons.
- [x] Make the center control pause and resume notifications without disabling any destination circle.
- [x] Update user feedback and accessibility labels to describe notification status accurately.
- [x] Add tests for notification-only sleep behavior and verify the compact control on mobile, build, and hybrid synchronization.
- [x] Save a checkpoint for the compact notification sleep-mode control upgrade.
- [x] Make both hub centers show the same sun while notifications are active.
- [x] Make tapping either center sun pause notifications and switch both hub centers to a crescent moon.
- [x] Make tapping either center moon restore notifications and switch both hub centers to a sun.
- [x] Keep every destination bubble navigable in sleep mode while applying a clear muted off-state treatment.
- [x] Add test coverage and validate active/sleep states on mobile, production build, and iOS/Android synchronization.
- [x] Save a checkpoint for the shared notification-state refinement.
