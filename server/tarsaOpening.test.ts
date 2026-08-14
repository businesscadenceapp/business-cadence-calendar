import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(import.meta.dirname, "..");
const openingSource = fs.readFileSync(path.join(projectRoot, "client/src/pages/TarsaOpening.tsx"), "utf8");
const appSource = fs.readFileSync(path.join(projectRoot, "client/src/App.tsx"), "utf8");
const launchStoryboard = fs.readFileSync(
  path.join(projectRoot, "ios/App/App/Base.lproj/LaunchScreen.storyboard"),
  "utf8",
);
const capacitorConfig = fs.readFileSync(path.join(projectRoot, "capacitor.config.json"), "utf8");

describe("TARSA native opening sequence", () => {
  it("presents the approved definition and waits for the user to continue", () => {
    expect(openingSource).toContain("TARSA");
    expect(openingSource).toContain("(n.) /'tar-shah/");
    expect(openingSource).toContain("Derived from the Hungarian word for “their partner” or “companion.”");
    expect(openingSource).toContain(">\n          Continue\n        </button>");
    expect(openingSource).not.toContain("setTimeout(() => continueIntoApp");
  });

  it("locks the opening page against vertical scroll and overscroll", () => {
    expect(openingSource).toContain('body.style.overflow = "hidden"');
    expect(openingSource).toContain('html.style.overscrollBehavior = "none"');
    expect(openingSource).toContain('touchAction: "pan-x"');
  });

  it("pins the opening screen before paint without dynamic viewport movement", () => {
    expect(openingSource).toContain("useLayoutEffect");
    expect(openingSource).toContain('html.style.scrollBehavior = "auto"');
    expect(openingSource).toContain("window.scrollTo(0, 0)");
    expect(openingSource).toContain('height: "100%"');
    expect(openingSource).not.toContain("min-h-[100dvh]");
    expect(openingSource).not.toContain('height: "100dvh"');
  });

  it("hides the native splash only after the stationary TARSA screen is ready", () => {
    expect(capacitorConfig).toContain('"launchAutoHide": false');
    expect(capacitorConfig).toContain('"contentInset": "never"');
    expect(openingSource).toContain("SplashScreen.hide({ fadeOutDuration: 0 })");
    expect(openingSource).toContain("window.requestAnimationFrame");
  });

  it("uses the branded opening sequence instead of sending native root directly to a route", () => {
    expect(appSource).toContain("function NativeHome() {");
    expect(appSource).toContain("return <TarsaOpening />;");
  });

  it("uses a neutral native launch surface instead of a heart-only splash image", () => {
    expect(launchStoryboard).not.toContain('image="Splash"');
    expect(launchStoryboard).not.toContain("<imageView");
  });
});
