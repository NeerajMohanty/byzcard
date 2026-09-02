import { describe, expect, it } from "vitest";
import {
  buildNdefUriMessage,
  checkNdefFit,
  ndefMessageSize,
  NFC_TAG_BUDGETS,
} from "@/core/ndef/build";

describe("NDEF URI record builder", () => {
  it("builds a short record with https:// abbreviation", () => {
    const url = "https://byzcard.example/s#pABC";
    const bytes = buildNdefUriMessage(url);
    // Header: MB|ME|SR|TNF=1 → 0xD1, type length 1, then payload length.
    expect(bytes[0]).toBe(0xd1);
    expect(bytes[1]).toBe(0x01);
    const rest = url.slice("https://".length);
    expect(bytes[2]).toBe(rest.length + 1);
    expect(bytes[3]).toBe(0x55); // 'U'
    expect(bytes[4]).toBe(0x04); // https:// prefix code
    const decoded = new TextDecoder().decode(bytes.subarray(5));
    expect(decoded).toBe(rest);
  });

  it("uses the https://www. abbreviation when applicable", () => {
    const bytes = buildNdefUriMessage("https://www.example.com/x");
    expect(bytes[4]).toBe(0x02);
  });

  it("falls back to no abbreviation for unknown schemes", () => {
    const bytes = buildNdefUriMessage("myapp://open");
    expect(bytes[4]).toBe(0x00);
    expect(new TextDecoder().decode(bytes.subarray(5))).toBe("myapp://open");
  });

  it("switches to the long-record form above 255 payload bytes", () => {
    const url = `https://byzcard.example/s#d${"A".repeat(300)}`;
    const bytes = buildNdefUriMessage(url);
    expect(bytes[0]).toBe(0xc1); // no SR flag
    expect(bytes[1]).toBe(0x01);
    const payloadLength =
      ((bytes[2] ?? 0) << 24) | ((bytes[3] ?? 0) << 16) | ((bytes[4] ?? 0) << 8) | (bytes[5] ?? 0);
    expect(payloadLength).toBe(url.length - "https://".length + 1);
    expect(bytes[6]).toBe(0x55);
  });

  it("reports exact message sizes and tag fit", () => {
    const shortUrl = "https://byzcard.example/s#pABC";
    expect(ndefMessageSize(shortUrl)).toBe(buildNdefUriMessage(shortUrl).length);
    const fit = checkNdefFit(shortUrl);
    expect(fit.fitsNtag215).toBe(true);
    expect(fit.fitsNtag216).toBe(true);

    const big = `https://byzcard.example/s#d${"A".repeat(NFC_TAG_BUDGETS.ntag215)}`;
    const bigFit = checkNdefFit(big);
    expect(bigFit.fitsNtag215).toBe(false);
    expect(bigFit.fitsNtag216).toBe(true);

    const huge = `https://byzcard.example/s#d${"A".repeat(NFC_TAG_BUDGETS.ntag216 + 50)}`;
    expect(checkNdefFit(huge).fitsNtag216).toBe(false);
  });
});
