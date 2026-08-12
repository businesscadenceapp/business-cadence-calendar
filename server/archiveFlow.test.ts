import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const routerSource = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");
const boardSource = readFileSync(new URL("../client/src/pages/Board.tsx", import.meta.url), "utf8");

describe("archive board flow", () => {
  it("allows the board list to include archived cards", () => {
    expect(routerSource).toContain("includeArchived: z.boolean().optional()");
    expect(routerSource).toContain("getBoardCards(input?.includeArchived ?? false");
  });

  it("loads archived cards into the board and exposes task archiving", () => {
    expect(boardSource).toContain('includeArchived: true');
    expect(boardSource).toContain('onArchive={id => archive.mutate({ id })}');
    expect(boardSource).toContain('onSeen={id => currentUser && markSeen.mutate({ id, seenBy: currentUser })}');
  });
});
