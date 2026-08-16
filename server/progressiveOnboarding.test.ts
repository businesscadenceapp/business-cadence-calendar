import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const overview = readFileSync(resolve(root, "client/src/components/TarsaBenefitsOverview.tsx"), "utf8");
const tour = readFileSync(resolve(root, "client/src/contexts/TourContext.tsx"), "utf8");
const board = readFileSync(resolve(root, "client/src/pages/Board.tsx"), "utf8");
const kpis = readFileSync(resolve(root, "client/src/pages/KpiReporting.tsx"), "utf8");
const reports = readFileSync(resolve(root, "client/src/pages/WeeklyReports.tsx"), "utf8");

describe("progressive TARSA onboarding", () => {
  it("uses a three-card benefits overview centered on Sleep Mode, private capture, and both hubs", () => {
    expect(overview).toContain("Work stays at work.");
    expect(overview).toContain("Capture it—don’t interrupt.");
    expect(overview).toContain("Run the business with rhythm.");
    expect(overview).toContain("automatically changes the center sun to a moon");
  });

  it("keeps the detailed map optional and limits it to five stops", () => {
    expect(tour.match(/id: "tour-/g)).toHaveLength(5);
    expect(board).toContain('if (pending === "1")');
    expect(board).not.toContain('pending === "1" || !completed');
  });

  it("offers contextual guidance inside the first task, update, issue, goal, KPI, and Report actions", () => {
    expect(board).toContain('<FirstUseGuide');
    expect(board).toContain('guideId={type}');
    expect(kpis).toContain('guideId="kpi"');
    expect(reports).toContain('guideId="report"');
  });
});
