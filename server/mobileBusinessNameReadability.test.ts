import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const switcher = readFileSync(resolve(root, "client/src/components/BusinessSwitcher.tsx"), "utf8");
const appShell = readFileSync(resolve(root, "client/src/components/AppShell.tsx"), "utf8");

describe("mobile business-name readability", () => {
  it("does not truncate the compact active-business name to the legacy narrow width", () => {
    expect(switcher).toContain("max-w-[155px]");
    expect(switcher).toContain("whitespace-normal");
    expect(switcher).not.toContain("truncate max-w-[80px]");
  });

  it("lets the left mobile header region use remaining width without squeezing the controls", () => {
    expect(appShell).toContain('className="flex flex-1 items-center gap-2 min-w-0"');
    expect(appShell).toContain('className="flex items-center gap-2 flex-shrink-0"');
  });
});
