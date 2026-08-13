import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(import.meta.dirname, "..");
const openingSource = fs.readFileSync(path.join(projectRoot, "client/src/pages/TarsaOpening.tsx"), "utf8");
const appSource = fs.readFileSync(path.join(projectRoot, "client/src/App.tsx"), "utf8");

describe("TARSA native opening sequence", () => {
  it("presents the approved definition and waits for the user to continue", () => {
    expect(openingSource).toContain("TARSA");
    expect(openingSource).toContain("(n.) /'tar-shah/");
    expect(openingSource).toContain("Derived from the Hungarian word for “their partner” or “companion.”");
    expect(openingSource).toContain(">\n          Continue\n        </button>");
    expect(openingSource).not.toContain("setTimeout(() => continueIntoApp");
  });

  it("uses the branded opening sequence instead of sending native root directly to a route", () => {
    expect(appSource).toContain("function NativeHome() {");
    expect(appSource).toContain("return <TarsaOpening />;");
  });
});
