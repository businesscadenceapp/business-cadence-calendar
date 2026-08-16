import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const sourceConfig = readFileSync(resolve(root, "capacitor.config.json"), "utf8");
const iosConfig = readFileSync(resolve(root, "ios/App/App/capacitor.config.json"), "utf8");
const infoPlist = readFileSync(resolve(root, "ios/App/App/Info.plist"), "utf8");

describe("native TARSA app naming", () => {
  it("uses TARSA for the iPhone display name without changing the established bundle ID", () => {
    expect(sourceConfig).toContain('"appName": "TARSA"');
    expect(iosConfig).toContain('"appName": "TARSA"');
    expect(infoPlist).toContain("<string>TARSA</string>");
    expect(sourceConfig).toContain('"appId": "com.businesscadence.calendar"');
  });
});
