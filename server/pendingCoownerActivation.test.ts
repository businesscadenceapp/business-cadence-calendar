import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const routerSource = readFileSync(resolve(root, "server/routers.ts"), "utf8");
const partnerRegisterSource = readFileSync(resolve(root, "client/src/pages/PartnerRegister.tsx"), "utf8");

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
});
