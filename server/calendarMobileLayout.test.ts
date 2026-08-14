import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const homePage = readFileSync(resolve(import.meta.dirname, "../client/src/pages/Home.tsx"), "utf8");

describe("mobile Calendar layout", () => {
  it("keeps the calendar within its app-shell height on mobile", () => {
    expect(homePage).toContain('className="h-full min-h-0 overflow-hidden flex flex-col"');
    expect(homePage).toContain('className="flex-1 min-h-0 overflow-hidden p-2 sm:p-5 flex flex-col gap-2 sm:gap-4"');
  });

  it("compresses meeting counts and removes nonessential mobile chrome", () => {
    expect(homePage).toContain('className="grid grid-cols-4 gap-1.5 sm:gap-3"');
    expect(homePage).toContain('<span className="sm:hidden">{m.shortLabel}</span>');
    expect(homePage).toContain('className="hidden sm:flex px-5 py-2.5 items-center justify-between flex-shrink-0"');
    expect(homePage).toContain('className="hidden sm:inline-flex text-[11px] font-semibold px-3 py-2 rounded-lg transition-all active:scale-95"');
  });
});
