import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(process.cwd());

function pngDimensions(relativePath: string) {
  const data = readFileSync(resolve(projectRoot, relativePath));
  expect(data.subarray(1, 4).toString("ascii")).toBe("PNG");

  return {
    width: data.readUInt32BE(16),
    height: data.readUInt32BE(20),
  };
}

describe("native mobile app icons", () => {
  it("uses a 1024 x 1024 iOS icon composed exactly from the clean approved heart", () => {
    expect(
      pngDimensions("ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png"),
    ).toEqual({ width: 1024, height: 1024 });
    const report = execFileSync("python3", ["scripts/verify_ios_icon_source_fidelity.py"], {
      cwd: projectRoot,
      encoding: "utf8",
    });
    expect(JSON.parse(report)).toMatchObject({ clean_heart_composition: "exact", size: [1024, 1024] });
  });

  it("provides the selected launcher icon at every Android density", () => {
    const expectedSizes = {
      "mipmap-ldpi": 36,
      "mipmap-mdpi": 48,
      "mipmap-hdpi": 72,
      "mipmap-xhdpi": 96,
      "mipmap-xxhdpi": 144,
      "mipmap-xxxhdpi": 192,
    } as const;

    for (const [density, size] of Object.entries(expectedSizes)) {
      expect(pngDimensions(`android/app/src/main/res/${density}/ic_launcher.png`)).toEqual({
        width: size,
        height: size,
      });
      expect(pngDimensions(`android/app/src/main/res/${density}/ic_launcher_round.png`)).toEqual({
        width: size,
        height: size,
      });
    }
  });

  it("does not add an Android adaptive-icon inset that could crop the approved artwork", () => {
    for (const filename of ["ic_launcher.xml", "ic_launcher_round.xml"]) {
      const xml = readFileSync(
        resolve(projectRoot, `android/app/src/main/res/mipmap-anydpi-v26/${filename}`),
        "utf8",
      );

      expect(xml).not.toContain("<inset");
      expect(xml).toContain('@mipmap/ic_launcher_background');
      expect(xml).toContain('@mipmap/ic_launcher_foreground');
    }
  });

  it("keeps the approved heart within the mobile launcher safe margin", () => {
    const report = execFileSync("python3", ["scripts/validate_app_icon_safe_margin.py"], {
      cwd: projectRoot,
      encoding: "utf8",
    });
    const parsed = JSON.parse(report) as {
      margins: Record<"left" | "top" | "right" | "bottom", number>;
      minimum: number;
    };

    for (const margin of Object.values(parsed.margins)) {
      expect(margin).toBeGreaterThanOrEqual(parsed.minimum);
    }
  });

  it("keeps the unchanged iPhone source safely inside a conservative rounded-square mask", () => {
    const report = execFileSync("python3", ["scripts/validate_ios_icon_mask.py"], {
      cwd: projectRoot,
      encoding: "utf8",
    });
    const parsed = JSON.parse(report) as {
      farthest_heart_pixel_distance: number;
      safe_mask_radius: number;
      remaining_corner_clearance: number;
    };

    expect(parsed.farthest_heart_pixel_distance).toBeLessThanOrEqual(parsed.safe_mask_radius);
    expect(parsed.remaining_corner_clearance).toBeGreaterThan(0);
  });

  it("keeps the high-detail vector faithful to the cleaned approved heart", () => {
    const report = execFileSync("python3", ["scripts/validate_vector_fidelity.py"], {
      cwd: projectRoot,
      encoding: "utf8",
    });
    expect(JSON.parse(report)).toMatchObject({ fidelity: "approved" });
  });
});
