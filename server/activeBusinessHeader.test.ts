import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const appShell = readFileSync(resolve(root, "client/src/components/AppShell.tsx"), "utf8");
const switcher = readFileSync(resolve(root, "client/src/components/BusinessSwitcher.tsx"), "utf8");

describe("active business header identity", () => {
  it("loads the current account’s business record for the header", () => {
    expect(appShell).toContain("trpc.business.list.useQuery");
    expect(appShell).toContain("accountBusinesses.length === 1");
    expect(appShell).toContain("businessIdentity={activeBusinessIdentity}");
  });

  it("renders a supplied business identity instead of the legacy business-key fallback", () => {
    expect(switcher).toContain("businessIdentity?:");
    expect(switcher).toContain("shortName: businessIdentity.name");
    expect(switcher).toContain('icon: businessIdentity.icon || "💼"');
  });
});
