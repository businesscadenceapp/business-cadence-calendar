import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const projectFile = readFileSync(
  resolve(root, "ios/App/App.xcodeproj/project.pbxproj"),
  "utf8",
);

describe("native TARSA TestFlight versioning", () => {
  it("uses a visible replacement version above Lynn's obsolete 1.0 (12) beta", () => {
    expect(projectFile.match(/MARKETING_VERSION = 1\.0\.1;/g)).toHaveLength(2);
    expect(projectFile.match(/CURRENT_PROJECT_VERSION = 13;/g)).toHaveLength(2);
  });
});
