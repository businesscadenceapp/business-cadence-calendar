import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const board = readFileSync(resolve(root, "client/src/pages/Board.tsx"), "utf8");
const styles = readFileSync(resolve(root, "client/src/index.css"), "utf8");

describe("Command Center mobile safe-area layout", () => {
  it("locks hub scrolling without detaching AppShell content from normal layout flow", () => {
    expect(board).toContain('mainEl.setAttribute("data-scroll", "locked")');
    expect(board).not.toContain('document.body.style.position = "fixed"');
    expect(styles).toContain('#app-main-scroll[data-scroll="locked"]');
    expect(styles).toContain('touch-action: pan-x !important;');
    expect(styles).not.toContain('position: fixed !important;');
  });
});
