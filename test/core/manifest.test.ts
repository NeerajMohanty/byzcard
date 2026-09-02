import { describe, expect, it } from "vitest";
import manifest from "@/app/manifest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("web app manifest (Home Screen install)", () => {
  const data = manifest();

  it("declares the BYZCARD identity", () => {
    expect(data.name).toBe("BYZCARD");
    expect(data.short_name).toBe("BYZCARD");
  });

  it("opens installed launches directly on the local card", () => {
    expect(data.start_url).toBe("/card");
    expect(data.scope).toBe("/");
    expect(data.display).toBe("standalone");
  });

  it("uses the dark theme colors", () => {
    expect(data.theme_color).toBe("#05070d");
    expect(data.background_color).toBe("#05070d");
  });

  it("references repository-local icons including 192, 512, and maskable", () => {
    const icons = data.icons ?? [];
    const sizes = icons.map((icon) => `${icon.sizes}:${icon.purpose ?? "any"}`);
    expect(sizes).toContain("192x192:any");
    expect(sizes).toContain("512x512:any");
    expect(sizes).toContain("512x512:maskable");
    for (const icon of icons) {
      expect(icon.src.startsWith("/icons/"), icon.src).toBe(true);
      // The referenced asset must actually exist in the repository.
      const file = readFileSync(join(process.cwd(), "public", icon.src));
      expect([...file.subarray(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);
    }
  });
});
