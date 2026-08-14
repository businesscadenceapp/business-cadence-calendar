# TARSA Opening Motion Investigation

The user reports two distinct unwanted visual handoffs: one immediately after launching the iPhone app and another after signing in. The authenticated app shell contains a `PageTransition` wrapper that delays replacement for 120 ms and animates opacity plus a `translateX(6px)` transform. This is an app-owned shared transition and should be removed for instant screen changes.

The native launch storyboard is a neutral deep-navy surface with no image view or custom transition code in `AppDelegate.swift`. The native Capacitor splash is currently held until `TarsaOpening` renders and then manually hidden with a zero-duration fade. Any remaining launch handoff must be handled as a native/system handoff rather than a web-page scroll.

The available native `AppIcon` includes a large dark square background and is not a direct substitute for the clean web opening mark, so it should not be inserted into the launch storyboard as a new visual while resolving motion.
