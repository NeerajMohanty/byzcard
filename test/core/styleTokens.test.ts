/**
 * Semantic guards on approved visual tokens and physical print dimensions.
 * Kept as file-content checks — robust against markup churn, strict about
 * the values the product owner approved.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (...path: string[]): string => readFileSync(join(process.cwd(), ...path), "utf8");

describe("approved card style tokens", () => {
  const cardCss = read("src", "components", "CardView.module.css");
  const cardTsx = read("src", "components", "CardView.tsx");

  it("QR stays at the approved reduced size (140px)", () => {
    expect(cardCss).toContain("width: 140px");
  });

  it("company label/value alignment stack remains", () => {
    expect(cardCss).toContain(".headerStack");
    expect(cardCss).toContain("align-items: flex-end");
  });

  it("card portrait is 96px", () => {
    expect(cardTsx).toContain("size={96}");
  });
});

describe("print layout physical dimensions", () => {
  const printCss = read("src", "features", "print", "print.module.css");
  const sheets = read("src", "features", "print", "PrintSheets.tsx");

  it("CR80 is exactly 3.375 × 2.125 in (landscape: width > height)", () => {
    expect(printCss).toContain("width: 3.375in");
    expect(printCss).toContain("height: 2.125in");
  });

  it("event badge is exactly 4 × 6 in (portrait: height > width)", () => {
    expect(printCss).toContain("width: 4in");
    expect(printCss).toContain("height: 6in");
  });

  it("@page sizes match both formats", () => {
    expect(sheets).toContain('cr80: "3.375in 2.125in"');
    expect(sheets).toContain('badge: "4in 6in"');
  });

  it("QR containers are forced square with preserved aspect ratio", () => {
    expect(printCss).toContain("aspect-ratio: 1 / 1");
  });

  it("dark card backgrounds are forced in print output", () => {
    expect(printCss).toContain("print-color-adjust: exact");
  });
});
