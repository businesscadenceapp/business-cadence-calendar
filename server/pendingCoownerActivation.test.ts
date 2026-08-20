import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const routerSource = readFileSync(resolve(root, "server/routers.ts"), "utf8");
const partnerRegisterSource = readFileSync(resolve(root, "client/src/pages/PartnerRegister.tsx"), "utf8");
const subscriptionOnboardingSource = readFileSync(resolve(root, "client/src/pages/SubscriptionOnboarding.tsx"), "utf8");
const tarsaOpeningSource = readFileSync(resolve(root, "client/src/pages/TarsaOpening.tsx"), "utf8");

describe("pending co-owner activation", () => {
  it("activates a pending co-owner record through the owner’s partner invite token", () => {
    expect(routerSource).toContain("activatePartnerInvite: publicProcedure");
    expect(routerSource).toContain("existing.accountId !== owner.accountId || existing.role !== \"coowner\"");
    expect(routerSource).toContain("inviteAccepted: true");
    expect(routerSource).toContain("await createPartnerLink(owner.accountId, owner.id, partner.id)");
  });

  it("uses partner activation rather than generic self-registration from the partner invite screen", () => {
    expect(partnerRegisterSource).toContain("trpc.subscription.activatePartnerInvite.useMutation");
    expect(partnerRegisterSource).toContain("token: partnerToken");
    expect(partnerRegisterSource).not.toContain("registerMutation.mutate");
  });

  it("keeps partner links out of generic owner onboarding", () => {
    expect(routerSource).toContain("const inviteUrl = `${input.origin}/partner-register?token=${token}`");
    expect(subscriptionOnboardingSource).toContain("navigate(`/partner-register?token=${encodeURIComponent(partnerToken)}`)");
    expect(partnerRegisterSource).not.toContain("navigate(`/onboarding?partnerToken=");
    expect(partnerRegisterSource).toContain('navigate("/app/board")');
  });

  it("gives an activated co-owner an explicit TARSA sign-in path in the native app", () => {
    expect(tarsaOpeningSource).toContain('const signInToExistingAccount = () => navigate("/login")');
    expect(tarsaOpeningSource).toContain("Already have a TARSA account? Sign in");
    expect(partnerRegisterSource).toContain("New to TARSA?");
    expect(partnerRegisterSource).not.toContain("New to BusinessCadence?");
  });
});
