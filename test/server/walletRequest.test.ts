import { describe, expect, it } from "vitest";
import { parseWalletRequest, WALLET_PHOTO_MAX_BYTES } from "@/server/walletRequest";
import { solidPng } from "@/server/png";

const FIELDS = {
  fullName: "Ada Lovelace",
  role: "Chief Analyst",
  company: "Analytical Engines",
  phone: "+1 647 000 0000",
  email: "ada@example.com",
};
const SERIAL = "abcdef0123456789";

describe("wallet request validation", () => {
  it("accepts a valid request without photo", () => {
    const result = parseWalletRequest(
      { fields: FIELDS, serialNumber: SERIAL },
      { allowPhoto: true },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.request.fields.fullName).toBe("Ada Lovelace");
      expect(result.request.photoPng).toBeUndefined();
    }
  });

  it("accepts a valid PNG photo when allowed", () => {
    const png = Buffer.from(solidPng(4, 1, 2, 3)).toString("base64");
    const result = parseWalletRequest(
      { fields: FIELDS, serialNumber: SERIAL, photoBase64: png },
      { allowPhoto: true },
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.request.photoPng?.length).toBeGreaterThan(8);
  });

  it("ignores photos when not allowed (Google)", () => {
    const png = Buffer.from(solidPng(4, 1, 2, 3)).toString("base64");
    const result = parseWalletRequest(
      { fields: FIELDS, serialNumber: SERIAL, photoBase64: png },
      { allowPhoto: false },
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.request.photoPng).toBeUndefined();
  });

  it("rejects non-PNG photo bytes", () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]).toString("base64");
    const result = parseWalletRequest(
      { fields: FIELDS, serialNumber: SERIAL, photoBase64: jpeg },
      { allowPhoto: true },
    );
    expect(result).toEqual({ ok: false, error: "invalid-photo" });
  });

  it("rejects oversized photos", () => {
    const big = Buffer.alloc(WALLET_PHOTO_MAX_BYTES + 1, 0x41);
    big.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const result = parseWalletRequest(
      { fields: FIELDS, serialNumber: SERIAL, photoBase64: big.toString("base64") },
      { allowPhoto: true },
    );
    expect(result).toEqual({ ok: false, error: "invalid-photo" });
  });

  it("rejects invalid serials", () => {
    for (const serialNumber of ["", "short", "UPPERCASE0123456", "with-dash-000000", 42]) {
      const result = parseWalletRequest({ fields: FIELDS, serialNumber }, { allowPhoto: true });
      expect(result.ok, String(serialNumber)).toBe(false);
    }
  });

  it("rejects invalid field payloads and non-objects", () => {
    expect(parseWalletRequest(null, { allowPhoto: true }).ok).toBe(false);
    expect(parseWalletRequest("x", { allowPhoto: true }).ok).toBe(false);
    expect(parseWalletRequest({ serialNumber: SERIAL }, { allowPhoto: true }).ok).toBe(false);
    expect(
      parseWalletRequest(
        { fields: { ...FIELDS, email: "nope" }, serialNumber: SERIAL },
        { allowPhoto: true },
      ),
    ).toEqual({ ok: false, error: "invalid-fields" });
  });
});
