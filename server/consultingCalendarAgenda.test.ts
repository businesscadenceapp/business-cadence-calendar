import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { OWNER_AGENDA_DEFAULTS } from "../shared/industryDefaults";

const root = process.cwd();
const home = readFileSync(resolve(root, "client/src/pages/Home.tsx"), "utf8");
const calendarData = readFileSync(resolve(root, "client/src/lib/calendarData.ts"), "utf8");

describe("consulting calendar agendas", () => {
  it("uses the persisted industry defaults rather than the legacy chiropractic fallback", () => {
    expect(home).toContain("OWNER_AGENDA_DEFAULTS");
    expect(home).toContain('block.business === "professional" ? "Consulting"');
    expect(home).toContain("industryItems ? \"Your Agenda\" : \"Time Breakdown by Business\"");
    expect(home).not.toContain('const dbBiz = BIZ_TO_DB[block.business] ?? "chiropractic"');
  });

  it("keeps the shared weekly wrap-up time in chronological order", () => {
    expect(calendarData).toContain("Wrap-up (1:30–1:45)");
    expect(calendarData).not.toContain("Wrap-up (1:45–1:30)");
  });

  it("uses consulting-relevant weekly content without patient terminology", () => {
    expect(OWNER_AGENDA_DEFAULTS.professional.weekly).toContain("Active client project status");
    expect(OWNER_AGENDA_DEFAULTS.professional.weekly).toContain("Billable hours vs. target");
    expect(OWNER_AGENDA_DEFAULTS.professional.weekly.join(" ")).not.toMatch(/patient|clinical|chiropractic/i);
  });
});
