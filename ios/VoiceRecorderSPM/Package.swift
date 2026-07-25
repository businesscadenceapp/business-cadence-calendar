// swift-tools-version: 5.9
// Vendored SPM wrapper for capacitor-voice-recorder (which ships only a podspec).
// Sources are copied from node_modules/capacitor-voice-recorder/ios/Plugin by
// scripts/sync-voice-recorder.mjs (run automatically via `pnpm cap:sync`).
import PackageDescription

let package = Package(
    name: "VoiceRecorderSPM",
    platforms: [.iOS(.v15)],
    products: [
        .library(
            name: "VoiceRecorderSPM",
            targets: ["VoiceRecorderPlugin"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", exact: "8.4.1")
    ],
    targets: [
        .target(
            name: "VoiceRecorderPlugin",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm")
            ],
            path: "Sources/VoiceRecorderPlugin")
    ]
)
