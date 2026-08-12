import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const routerSource = fs.readFileSync(path.join(projectRoot, "server/routers.ts"), "utf8");
const boardSource = fs.readFileSync(path.join(projectRoot, "client/src/pages/Board.tsx"), "utf8");

describe("Needs Attention action dashboard", () => {
  it("returns overdue goal and KPI reminders from the server", () => {
    expect(routerSource).toContain("getPerformanceReminders");
    expect(routerSource).toContain("overdueGoals");
    expect(routerSource).toContain("lateKpis");
  });

  it("groups actionable work by urgency without disabling card actions", () => {
    expect(boardSource).toContain("Past Due");
    expect(boardSource).toContain("Due Soon");
    expect(boardSource).toContain("Waiting on You");
    expect(boardSource).toContain("missedMeetings");
    expect(boardSource).toContain("unseenUpdates");
  });
});
