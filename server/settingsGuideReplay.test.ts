import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const settings = readFileSync(resolve(process.cwd(), "client/src/pages/Settings.tsx"), "utf8");

describe("Settings Explore TARSA replay area", () => {
  it("keeps the optional five-stop map replay at the bottom of Settings", () => {
    expect(settings).toContain("Explore TARSA");
    expect(settings).toContain("TOUR_PENDING_KEY");
    expect(settings).toContain('navigate("/app/board")');
  });

  it("provides previews for every contextual feature guide without resetting user progress", () => {
    expect(settings).toContain("Feature guide previews");
    expect(settings).toContain("This does not reset or change anyone’s progress.");
    for (const label of ["Task", "Update", "Issue", "Goal", "KPI", "Reports"]) {
      expect(settings).toContain(`label: "${label}"`);
    }
  });
});
