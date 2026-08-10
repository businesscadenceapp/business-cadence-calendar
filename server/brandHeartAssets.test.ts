import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..");
const approvedHeart = "/manus-storage/business-cadence-heart-high-fidelity_d44c6838.svg";
const approvedEmailHeart = "business-cadence-heart-email_bad58bc7.png";

describe("approved Business Cadence heart branding", () => {
  it("uses the approved heart in shared navigation and landing branding", () => {
    const brandLogo = readFileSync(resolve(projectRoot, "client/src/components/BrandLogo.tsx"), "utf8");
    const landing = readFileSync(resolve(projectRoot, "client/src/pages/Landing.tsx"), "utf8");

    expect(brandLogo).toContain(approvedHeart);
    expect(landing).toContain(approvedHeart);
    expect(brandLogo).not.toContain("bc-logo-icon-1024_9039afef.png");
    expect(landing).not.toContain("heart-transparent-clean_14235c91.png");
  });

  it("uses the shared approved logo on the invitation screen", () => {
    const invite = readFileSync(resolve(projectRoot, "client/src/pages/AcceptInvite.tsx"), "utf8");

    expect(invite).toContain('import BrandLogo from "@/components/BrandLogo"');
    expect(invite).toContain('<BrandLogo size="xl" />');
    expect(invite).not.toContain("businesscadence-logo-final-clean_3f67cebb.webp");
  });

  it("uses the approved heart in every branded email template", () => {
    const email = readFileSync(resolve(projectRoot, "server/email.ts"), "utf8");

    expect(email).toContain(approvedEmailHeart);
    expect(email).not.toContain("businesscadence-logo-final-clean_3f67cebb.webp");
  });
});
