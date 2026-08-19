import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const invitePartnerSetup = readFileSync(
  resolve(root, "client/src/pages/InvitePartnerSetup.tsx"),
  "utf8",
);

describe("new owner account setup", () => {
  it("requires account creation before business naming and partner invitation", () => {
    expect(invitePartnerSetup).toContain("Create your TARSA account");
    expect(invitePartnerSetup).toContain("Create Account & Continue");
    expect(invitePartnerSetup).toContain("const registerOwner = trpc.person.register.useMutation");
    expect(invitePartnerSetup).toContain("accountId: 0");
  });

  it("does not redirect an unauthenticated new owner to login from Send Invite", () => {
    expect(invitePartnerSetup).not.toContain('toast.error("Please sign in first."); navigate("/login"); return;');
  });
});
