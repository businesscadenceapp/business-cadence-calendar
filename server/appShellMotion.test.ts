import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(import.meta.dirname, "..");
const appShellSource = fs.readFileSync(
  path.join(projectRoot, "client/src/components/AppShell.tsx"),
  "utf8",
);

describe("AppShell motion", () => {
  it("changes authenticated screens immediately without an outgoing page transition", () => {
    expect(appShellSource).toContain("function PageContent");
    expect(appShellSource).toContain("<PageContent>");
    expect(appShellSource).not.toContain("function PageTransition");
    expect(appShellSource).not.toContain('translateX(6px)');
    expect(appShellSource).not.toContain("setTimeout(() =>");
    expect(appShellSource).toContain('transition: "none"');
  });
});
