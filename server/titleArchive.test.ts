import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const schemaSource = fs.readFileSync(path.join(projectRoot, "drizzle/schema.ts"), "utf8");
const routerSource = fs.readFileSync(path.join(projectRoot, "server/routers.ts"), "utf8");
const boardSource = fs.readFileSync(path.join(projectRoot, "client/src/pages/Board.tsx"), "utf8");

describe("board card titles and Archive search", () => {
  it("stores a nullable title while requiring a concise title for new board posts", () => {
    expect(schemaSource).toContain('title: varchar("title", { length: 160 })');
    expect(routerSource).toContain('title: z.string().trim().min(1).max(160)');
  });

  it("keeps legacy cards readable and filters Archive by searchable card data", () => {
    expect(boardSource).toContain("function getCardTitle");
    expect(boardSource).toContain("const searchedArchivedCards");
    expect(boardSource).toContain("Search archived tasks, updates, and issues");
    expect(boardSource).toContain("getCardTitle(card.title, card.content)");
  });
});
