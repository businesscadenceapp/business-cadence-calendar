import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..");

describe("TARSA web branding preview", () => {
  it("uses TARSA in the shared wordmark, public landing page, and browser metadata", () => {
    const brandLogo = readFileSync(resolve(projectRoot, "client/src/components/BrandLogo.tsx"), "utf8");
    const landing = readFileSync(resolve(projectRoot, "client/src/pages/Landing.tsx"), "utf8");
    const indexHtml = readFileSync(resolve(projectRoot, "client/index.html"), "utf8");
    const manifest = readFileSync(resolve(projectRoot, "client/public/manifest.json"), "utf8");

    expect(brandLogo).toContain("TARSA");
    expect(landing).toContain(">TARSA</span>");
    expect(landing).toContain("TARSA is the app built for couples");
    expect(landing).toContain("TARSA. All rights reserved.");
    expect(indexHtml).toContain("<title>TARSA — App for Couples Who Own a Business Together</title>");
    expect(manifest).toContain('"short_name": "TARSA"');
  });
});
