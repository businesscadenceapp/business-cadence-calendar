import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const selectorSource = readFileSync(
  new URL("../client/src/pages/BusinessSelector.tsx", import.meta.url),
  "utf8",
);

describe("BusinessSelector viewport behavior", () => {
  it("locks the selector to the dynamic viewport and prevents browser panning", () => {
    expect(selectorSource).toContain('className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden overscroll-none"');
    expect(selectorSource).toContain('height: "100dvh"');
    expect(selectorSource).toContain('maxHeight: "100dvh"');
    expect(selectorSource).toContain('touchAction: "none"');
  });
});
