import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BrandMark } from "@/components/BrandMark";

describe("BrandMark", () => {
  it("reads to assistive technology as exactly 'Byzcard' with the icon hidden", () => {
    const { container } = render(<BrandMark />);
    expect(container.textContent).toBe("Byzcard");
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
    expect(svg?.getAttribute("focusable")).toBe("false");
  });

  it("scales by size without altering the canonical geometry", () => {
    const { container } = render(<BrandMark iconSize={9} />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("width")).toBe("9");
    expect(svg?.getAttribute("height")).toBe("9");
    // The geometry mirrors public/brand/byzcard-b-logo.svg verbatim.
    expect(svg?.getAttribute("viewBox")).toBe("0 0 280 280");
    expect(container.querySelector("path")?.getAttribute("d")).toContain("M55 26");
  });
});
