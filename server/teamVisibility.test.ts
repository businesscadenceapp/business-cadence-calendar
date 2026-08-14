import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");

function source(relativePath: string) {
  return readFileSync(resolve(projectRoot, relativePath), "utf8");
}

describe("Team visibility gates", () => {
  it("keeps the retained Team feature disabled for live users", () => {
    expect(source("client/src/featureFlags.ts")).toContain("export const TEAM_ENABLED = false");
  });

  it("hides Team-only Settings sections and places the replay control at the bottom", () => {
    const settings = source("client/src/pages/Settings.tsx");

    expect(settings).toContain("TEAM_ENABLED && (person?.role === \"owner\" || person?.role === \"coowner\")");
    expect(settings).toContain("<TourReplayCard");
    expect(settings.lastIndexOf("<TourReplayCard")).toBeGreaterThan(settings.lastIndexOf("Team Calendar Visibility"));
  });

  it("keeps Team routes and staff controls unavailable while preserving their code", () => {
    expect(source("client/src/App.tsx")).toContain("TEAM_ENABLED ? <Protected component={EmployeeSetup} /> : <Redirect to=\"/app/board\" />");
    expect(source("client/src/pages/ManageSchedule.tsx")).toContain("{TEAM_ENABLED && <div>");
    expect(source("client/src/pages/WeeklyReports.tsx")).toContain("{TEAM_ENABLED && (");
  });
});
