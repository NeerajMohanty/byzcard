import { describe, expect, it } from "vitest";
import {
  buildVcard,
  escapeVcardText,
  foldVcardLine,
  slugifyName,
  vcardFilename,
} from "@/core/vcard/build";
import type { CardFields } from "@/core/card/types";

const FIELDS: CardFields = {
  fullName: "Ada Lovelace",
  role: "Chief Analyst",
  company: "Analytical Engines Ltd",
  phone: "+1 647 000 0000",
  email: "ada@example.com",
  website: "https://example.com",
  linkedin: "https://www.linkedin.com/in/ada",
};

describe("vCard 3.0 builder", () => {
  it("produces a well-formed vCard with CRLF endings", () => {
    const vcard = buildVcard(FIELDS);
    expect(vcard.startsWith("BEGIN:VCARD\r\nVERSION:3.0\r\n")).toBe(true);
    expect(vcard.endsWith("END:VCARD\r\n")).toBe(true);
    expect(vcard).toContain("FN:Ada Lovelace");
    expect(vcard).toContain("N:Lovelace;Ada;;;");
    expect(vcard).toContain("ORG:Analytical Engines Ltd");
    expect(vcard).toContain("TITLE:Chief Analyst");
    expect(vcard).toContain("TEL;TYPE=CELL:+1 647 000 0000");
    expect(vcard).toContain("EMAIL;TYPE=INTERNET:ada@example.com");
    expect(vcard).toContain("URL:https://example.com");
    expect(vcard).toContain("item1.URL:https://www.linkedin.com/in/ada");
    expect(vcard).toContain("item1.X-ABLabel:LinkedIn");
    // No bare LF anywhere.
    expect(vcard.replace(/\r\n/gu, "")).not.toContain("\n");
  });

  it("escapes special characters", () => {
    expect(escapeVcardText("a;b,c\\d")).toBe("a\\;b\\,c\\\\d");
    expect(escapeVcardText("line1\nline2")).toBe("line1\\nline2");
    const vcard = buildVcard({ ...FIELDS, company: "Smith; Jones, & Co\\" });
    expect(vcard).toContain("ORG:Smith\\; Jones\\, & Co\\\\");
  });

  it("handles unicode names", () => {
    const vcard = buildVcard({ ...FIELDS, fullName: "Šárka Nguyễn 佐藤" });
    expect(vcard).toContain("FN:Šárka Nguyễn 佐藤");
    expect(vcard).toContain("N:佐藤;Šárka Nguyễn;;;");
  });

  it("omits optional properties when absent", () => {
    const vcard = buildVcard({ ...FIELDS, website: undefined, linkedin: undefined });
    expect(vcard).not.toContain("URL:");
    expect(vcard).not.toContain("X-ABLabel");
    expect(vcard).not.toContain("—"); // presentation-only em dash never exported
  });

  it("embeds a photo folded to 75-octet lines", () => {
    const base64 = "QUJD".repeat(120); // 480 chars
    const vcard = buildVcard(FIELDS, { mimeType: "image/jpeg", base64 });
    expect(vcard).toContain("PHOTO;ENCODING=b;TYPE=JPEG:");
    const lines = vcard.split("\r\n");
    const encoder = new TextEncoder();
    for (const line of lines) {
      expect(encoder.encode(line).length, `line too long: ${line}`).toBeLessThanOrEqual(76);
    }
    // Unfolding restores the full base64 content.
    const unfolded = vcard.replace(/\r\n /gu, "");
    expect(unfolded).toContain(base64);
  });

  it("marks PNG photos as PNG", () => {
    const vcard = buildVcard(FIELDS, { mimeType: "image/png", base64: "QUJD" });
    expect(vcard).toContain("PHOTO;ENCODING=b;TYPE=PNG:");
  });

  it("folds unicode lines on character boundaries", () => {
    const line = `FN:${"名".repeat(60)}`;
    const folded = foldVcardLine(line);
    const unfolded = folded.replace(/\r\n /gu, "");
    expect(unfolded).toBe(line);
    for (const piece of folded.split("\r\n")) {
      expect(new TextEncoder().encode(piece).length).toBeLessThanOrEqual(76);
    }
  });

  it("generates sensible filenames", () => {
    expect(vcardFilename("Ada Lovelace")).toBe("ada-lovelace.vcf");
    expect(slugifyName("  Šárka  Nguyễn ")).toBe("šárka-nguyễn");
    expect(vcardFilename("!!!")).toBe("card.vcf");
  });
});
