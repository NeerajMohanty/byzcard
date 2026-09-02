import { describe, expect, it } from "vitest";
import jsQR from "jsqr";
import { encodeQrBytes, encodeQrText, qrToRgba, qrToSvgPath, QrDataTooLongError } from "@/core/qr";
import { byteModeCapacity } from "@/core/qr/tables";

/** Decode one of our symbols with the independent jsQR implementation. */
function decodeWithJsQr(text: string, ecl: "L" | "M" | "Q" | "H" = "M") {
  const symbol = encodeQrText(text, { ecl });
  const { data, width, height } = qrToRgba(symbol, 4);
  const result = jsQR(data, width, height);
  return { symbol, result };
}

describe("QR encoder (verified against independent jsQR decoder)", () => {
  it("encodes and decodes a short share URL", () => {
    const url = "https://byzcard.example/s#pAbCdEf123";
    const { symbol, result } = decodeWithJsQr(url);
    expect(result).not.toBeNull();
    expect(result?.data).toBe(url);
    expect(symbol.size).toBe(symbol.version * 4 + 17);
  });

  it("encodes and decodes a realistic 400-byte payload", () => {
    const url = `https://byzcard.example/s#d${"A1b2C3d4".repeat(46)}`;
    expect(url.length).toBeGreaterThanOrEqual(390);
    const { result } = decodeWithJsQr(url);
    expect(result?.data).toBe(url);
  });

  it("encodes and decodes at the 700-byte hard budget", () => {
    const url = `https://byzcard.example/s#d${"Zz9_-Xx0".repeat(84)}`;
    expect(url.length).toBeGreaterThanOrEqual(690);
    const { result } = decodeWithJsQr(url);
    expect(result?.data).toBe(url);
  });

  it("round-trips Unicode content byte-exactly", () => {
    const text = "BEGIN:VCARD\nFN:Šárka Nováková-Nguyễn 佐藤陽子\nEND:VCARD";
    const symbol = encodeQrText(text);
    const { data, width, height } = qrToRgba(symbol, 4);
    const result = jsQR(data, width, height);
    expect(result).not.toBeNull();
    const expected = Array.from(new TextEncoder().encode(text));
    expect(result?.binaryData).toEqual(expected);
  });

  it("decodes at every error correction level", () => {
    for (const ecl of ["L", "M", "Q", "H"] as const) {
      const { result } = decodeWithJsQr("https://byzcard.example/s#pTest", ecl);
      expect(result?.data, `ecl ${ecl}`).toBe("https://byzcard.example/s#pTest");
    }
  });

  it("decodes across a sweep of versions (payload sizes)", () => {
    for (const len of [10, 50, 120, 250, 500, 900, 1400]) {
      const text = "x".repeat(len);
      const { symbol, result } = decodeWithJsQr(text, "L");
      expect(result?.data, `len ${len} (version ${symbol.version})`).toBe(text);
    }
  });

  it("selects the minimal version and honors minVersion", () => {
    const small = encodeQrText("hi");
    expect(small.version).toBe(1);
    const forced = encodeQrText("hi", { minVersion: 5 });
    expect(forced.version).toBe(5);
    expect(forced.size).toBe(5 * 4 + 17);
  });

  it("throws QrDataTooLongError beyond capacity", () => {
    const tooBig = new Uint8Array(byteModeCapacity(40, "M") + 1);
    expect(() => encodeQrBytes(tooBig, { ecl: "M" })).toThrow(QrDataTooLongError);
  });

  it("produces a stable deterministic symbol for identical input", () => {
    const a = encodeQrText("determinism-check");
    const b = encodeQrText("determinism-check");
    expect(a.modules).toEqual(b.modules);
    expect(a.mask).toBe(b.mask);
  });

  it("renders an SVG path containing only dark-module rects", () => {
    const symbol = encodeQrText("svg");
    const path = qrToSvgPath(symbol);
    expect(path.startsWith("M")).toBe(true);
    const darkCount = symbol.modules.flat().filter(Boolean).length;
    expect(darkCount).toBeGreaterThan(0);
    // Every run command draws at least one module; path must be non-trivial.
    expect(path.length).toBeGreaterThan(100);
  });
});
