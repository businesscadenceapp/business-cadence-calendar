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

  it("uses the branded opening sequence instead of sending native root directly to a route", () => {
    expect(appSource).toContain("function NativeHome() {");
    expect(appSource).toContain("return <TarsaOpening />;");
  });

  it("uses a neutral native launch surface instead of a heart-only splash image", () => {
    expect(launchStoryboard).not.toContain('image="Splash"');
    expect(launchStoryboard).not.toContain("<imageView");
  });
});
