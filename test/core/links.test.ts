import { describe, expect, it } from "vitest";
import { cardLinks, mailtoHref, safeExternalUrl, telHref } from "@/core/card/links";

describe("safeExternalUrl", () => {
  it("adds https to bare hosts and keeps explicit schemes", () => {
    expect(safeExternalUrl("github.com/user")).toBe("https://github.com/user");
    expect(safeExternalUrl("instagram.com/user")).toBe("https://instagram.com/user");
    expect(safeExternalUrl("linkedin.com/in/user")).toBe("https://linkedin.com/in/user");
    expect(safeExternalUrl("https://example.com/portfolio")).toBe("https://example.com/portfolio");
    expect(safeExternalUrl("http://legacy.example.com")).toBe("http://legacy.example.com");
  });

  it("refuses anything that is not a plain web URL", () => {
    expect(safeExternalUrl("javascript:alert(1)")).toBeNull();
    expect(safeExternalUrl("data:text/html,hi")).toBeNull();
    expect(safeExternalUrl("file:///etc/passwd")).toBeNull();
    expect(safeExternalUrl("https:///nohost")).toBeNull();
    expect(safeExternalUrl("not a url")).toBeNull();
    expect(safeExternalUrl("")).toBeNull();
    expect(safeExternalUrl(undefined)).toBeNull();
  });

  it("refuses a malformed scheme instead of stacking a second one onto it", () => {
    expect(safeExternalUrl("https//github.com/user")).toBeNull();
  });
});

describe("telHref / mailtoHref", () => {
  it("keeps only dialable characters and builds a mailto", () => {
    expect(telHref("+1 (647) 000-0000")).toBe("tel:+16470000000");
    expect(mailtoHref("ada@example.com")).toBe("mailto:ada@example.com");
  });
});

describe("cardLinks", () => {
  it("is empty when the card has no optional links", () => {
    expect(cardLinks({})).toEqual([]);
    expect(cardLinks({ social: [], messaging: [], links: [] })).toEqual([]);
    expect(cardLinks({ linkedin: undefined })).toEqual([]);
  });

  it("renders the dedicated LinkedIn field as a valid tappable action", () => {
    expect(cardLinks({ linkedin: "https://linkedin.com/in/neerajmohanty" })).toEqual([
      {
        key: "linkedin",
        service: "linkedin",
        label: "LinkedIn",
        href: "https://linkedin.com/in/neerajmohanty",
      },
    ]);
  });

  it("orders LinkedIn first, then social, messaging and links", () => {
    const links = cardLinks({
      linkedin: "https://www.linkedin.com/in/ada",
      social: [{ service: "instagram", value: "https://instagram.com/ada" }],
      messaging: [{ service: "whatsapp", value: "https://wa.me/15550100100" }],
      links: [
        { service: "github", value: "https://github.com/ada" },
        { service: "custom", value: "https://ada.example.org/portfolio" },
      ],
    });
    expect(links.map((l) => l.label)).toEqual([
      "LinkedIn",
      "Instagram",
      "WhatsApp",
      "GitHub",
      "ada.example.org",
    ]);
    expect(links.map((l) => l.href)).toEqual([
      "https://www.linkedin.com/in/ada",
      "https://instagram.com/ada",
      "https://wa.me/15550100100",
      "https://github.com/ada",
      "https://ada.example.org/portfolio",
    ]);
    expect(new Set(links.map((l) => l.key)).size).toBe(links.length);
    expect(links.map((l) => l.service)).toEqual([
      "linkedin",
      "instagram",
      "whatsapp",
      "github",
      "custom",
    ]);
  });

  it("lists the same destination once even when several fields point to it", () => {
    const links = cardLinks({
      linkedin: "https://www.linkedin.com/in/ada",
      social: [
        { service: "linkedin", value: "https://linkedin.com/in/ada/" },
        { service: "linkedin", value: "https://linkedin.com/in/ada-other" },
      ],
    });
    expect(links.map((l) => l.href)).toEqual([
      "https://www.linkedin.com/in/ada",
      "https://linkedin.com/in/ada-other",
    ]);
  });

  it("skips entries whose value is not yet a valid web URL (live editing)", () => {
    const links = cardLinks({
      social: [{ service: "instagram", value: "" }],
      links: [
        { service: "github", value: "github.com/ada" },
        { service: "custom", value: "javascript:alert(1)" },
      ],
    });
    expect(links).toEqual([
      { key: "links-0", service: "github", label: "GitHub", href: "https://github.com/ada" },
    ]);
  });
});
