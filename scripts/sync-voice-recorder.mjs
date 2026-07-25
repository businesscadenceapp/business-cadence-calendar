/**
 * Copies capacitor-voice-recorder iOS sources from node_modules into the
 * vendored SPM package (ios/VoiceRecorderSPM), converting the ObjC plugin
 * registration to the Swift CAPBridgedPlugin style used by Capacitor SPM apps.
 *
 * Why: capacitor-voice-recorder ships only a CocoaPods podspec; this project's
 * iOS app uses Capacitor's SPM integration (CapApp-SPM), so `cap sync` cannot
 * link the plugin automatically. Run after `pnpm install` / before iOS builds:
 *   node scripts/sync-voice-recorder.mjs
 * (wired into the cap:sync npm script)
 */
import { cpSync, mkdirSync, readdirSync, rmSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const src = join(root, "node_modules/capacitor-voice-recorder/ios/Plugin");
const dest = join(root, "ios/VoiceRecorderSPM/Sources/VoiceRecorderPlugin");

if (!existsSync(src)) {
  console.error("capacitor-voice-recorder not installed; skipping vendored copy");
  process.exit(0);
}

rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });

// Copy Swift sources only (skip ObjC .h/.m registration files and Info.plist —
// SPM targets can't mix Swift and ObjC, and registration is redone in Swift below)
for (const f of readdirSync(src)) {
  if (f.endsWith(".swift")) cpSync(join(src, f), join(dest, f));
}

// Convert the class to the Capacitor >=5 Swift registration style
// (CAPPlugin, CAPBridgedPlugin with stored identifier/jsName/pluginMethods),
// replacing the old ObjC CAP_PLUGIN macro registration from the removed .m file.
// This mirrors the official @capacitor/* SPM plugins (e.g. SplashScreenPlugin).
const mainFile = join(dest, "VoiceRecorder.swift");
let code = readFileSync(mainFile, "utf8");
const bridged = `public class VoiceRecorder: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "VoiceRecorder"
    public let jsName = "VoiceRecorder"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "canDeviceVoiceRecord", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestAudioRecordingPermission", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "hasAudioRecordingPermission", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "startRecording", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stopRecording", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "pauseRecording", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "resumeRecording", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getCurrentStatus", returnType: CAPPluginReturnPromise)
    ]
`;
if (code.includes("public class VoiceRecorder: CAPPlugin {")) {
  code = code.replace("public class VoiceRecorder: CAPPlugin {", bridged);
  writeFileSync(mainFile, code);
} else if (!code.includes("CAPBridgedPlugin")) {
  console.error("WARNING: VoiceRecorder.swift class declaration changed upstream — update scripts/sync-voice-recorder.mjs");
  process.exit(1);
}

console.log("Vendored voice-recorder sources into ios/VoiceRecorderSPM");
