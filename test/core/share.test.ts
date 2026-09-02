import { describe, expect, it } from "vitest";
import { decodeSharePayload, encodeSharePayload } from "@/core/share/codec";
import {
  analyzeShareSize,
  buildShareUrl,
  fragmentOfShareUrl,
  SHARE_URL_HARD_LIMIT_BYTES,
} from "@/core/share/url";
import type { CardFields } from "@/core/card/types";

const BASE: CardFields = {
  fullName: "Ada Lovelace",
  role: "Chief Analyst",
  company: "Analytical Engines Ltd",
  phone: "+1 647 000 0000",
  email: "ada@example.com",
  website: "https://example.com",
  linkedin: "https://www.linkedin.com/in/ada",
};

describe("SharePayloadV1 codec", () => {
  it("round-trips a full card", async () => {
    const fragment = await encodeSharePayload(BASE);
    const decoded = await decodeSharePayload(fragment);
    expect(decoded.ok).toBe(true);
    if (decoded.ok) {
      expect(decoded.payload.version).toBe(1);
      expect(decoded.payload.fullName).toBe(BASE.fullName);
      expect(decoded.payload.linkedin).toBe(BASE.linkedin);
    }
  });

  it("round-trips without optional fields", async () => {
    const fields: CardFields = { ...BASE, website: undefined, linkedin: undefined };
    const decoded = await decodeSharePayload(await encodeSharePayload(fields));
    expect(decoded.ok).toBe(true);
    if (decoded.ok) {
      expect(decoded.payload.website).toBeUndefined();
      expect(decoded.payload.linkedin).toBeUndefined();
      // The owner-card em dash is presentation-only and must never leak.
      expect(JSON.stringify(decoded.payload)).not.toContain("—");
    }
  });

  it("preserves Unicode names and international phone numbers", async () => {
    const fields: CardFields = {
      ...BASE,
      fullName: "Šárka Nguyễn-佐藤 Θεοδώρα",
      phone: "+91 98765 43210",
      company: "Компания «Пример»",
    };
    const decoded = await decodeSharePayload(await encodeSharePayload(fields));
    expect(decoded.ok).toBe(true);
    if (decoded.ok) {
      expect(decoded.payload.fullName).toBe(fields.fullName);
      expect(decoded.payload.phone).toBe(fields.phone);
      expect(decoded.payload.company).toBe(fields.company);
    }
  });

  it("produces a URL-fragment-safe ASCII string", async () => {
    const fragment = await encodeSharePayload({ ...BASE, fullName: "日本語の名前テスト" });
    expect(/^[dp][A-Za-z0-9_-]+$/u.test(fragment)).toBe(true);
  });

  it("accepts a leading # on decode", async () => {
    const fragment = await encodeSharePayload(BASE);
    const decoded = await decodeSharePayload(`#${fragment}`);
    expect(decoded.ok).toBe(true);
  });

  it("rejects empty, malformed, and corrupted payloads", async () => {
    expect((await decodeSharePayload("")).ok).toBe(false);
    expect((await decodeSharePayload("#")).ok).toBe(false);
    expect((await decodeSharePayload("x!!!not-base64!!!")).ok).toBe(false);
    expect((await decodeSharePayload("pAAAA")).ok).toBe(false);
    const fragment = await encodeSharePayload(BASE);
    const corrupted = `${fragment.slice(0, 8)}QQQQ${fragment.slice(12)}`;
    const decoded = await decodeSharePayload(corrupted);
    expect(decoded.ok).toBe(false);
  });

  it("rejects unsupported future versions", async () => {
    const bytes = new TextEncoder().encode(JSON.stringify([2, "a", "b", "c", "d", "e"]));
    let b64 = "";
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    // quick local base64url for the test
    for (let i = 0; i < bytes.length; i += 3) {
      const [b0 = 0, b1, b2] = [bytes[i], bytes[i + 1], bytes[i + 2]];
      b64 += alphabet[b0 >> 2];
      b64 += alphabet[((b0 & 3) << 4) | ((b1 ?? 0) >> 4)];
      if (b1 === undefined) break;
      b64 += alphabet[((b1 & 15) << 2) | ((b2 ?? 0) >> 6)];
      if (b2 === undefined) break;
      b64 += alphabet[b2 & 63];
    }
    const decoded = await decodeSharePayload(`p${b64}`);
    expect(decoded).toEqual({ ok: false, error: "unsupported-version" });
  });

  it("rejects payloads whose fields fail validation", async () => {
    const bad = JSON.stringify([1, "Name", "Role", "Co", "not-a-phone!!x", "not-an-email"]);
    const bytes = new TextEncoder().encode(bad);
    const { base64UrlEncode } = await import("@/core/share/bytes");
    const decoded = await decodeSharePayload(`p${base64UrlEncode(bytes)}`);
    expect(decoded).toEqual({ ok: false, error: "invalid-fields" });
  });

  it("keeps realistic cards inside the hard URL budget", async () => {
    const fragment = await encodeSharePayload(BASE);
    const url = buildShareUrl("https://byzcard.example", fragment);
    const size = analyzeShareSize(url);
    expect(size.bytes).toBeLessThanOrEqual(SHARE_URL_HARD_LIMIT_BYTES);
    expect(size.level).toBe("ok");
  });

  it("flags oversized payloads via analyzeShareSize", () => {
    const size = analyzeShareSize(`https://byzcard.example/s#p${"A".repeat(800)}`);
    expect(size.level).toBe("error");
  });

  it("extracts fragments from share URLs", () => {
    expect(fragmentOfShareUrl("https://x.example/s#pABC")).toBe("pABC");
    expect(fragmentOfShareUrl("https://x.example/s")).toBeNull();
  });
});
