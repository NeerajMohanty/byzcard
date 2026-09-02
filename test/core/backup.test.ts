import { describe, expect, it } from "vitest";
import { backupFilename, parseBackup, serializeBackup } from "@/core/backup/codec";
import { BACKUP_FILE_MAX_BYTES } from "@/core/backup/schema";
import { buildCard, validateCardFields } from "@/core/card/validate";

function makeCard() {
  const validated = validateCardFields({
    fullName: "Ada Lovelace",
    role: "Chief Analyst",
    company: "Analytical Engines",
    phone: "+1 647 000 0000",
    email: "ada@example.com",
    website: "example.com",
  });
  if (!validated.ok) throw new Error("fixture invalid");
  return buildCard(validated.fields);
}

describe("backup export/import codec", () => {
  it("round-trips card + photo + wallet ids", () => {
    const card = makeCard();
    const photo = {
      mimeType: "image/jpeg" as const,
      width: 512,
      height: 512,
      dataBase64: "QUJDRA==",
    };
    const walletIds = { appleSerialNumber: "serial-1" };
    const text = serializeBackup({ card, photo, walletIds }, "2026-09-01T00:00:00.000Z");
    const parsed = parseBackup(text);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.backup.card).toEqual(card);
      expect(parsed.backup.photo).toEqual(photo);
      expect(parsed.backup.walletIds).toEqual(walletIds);
      expect(parsed.backup.exportedAt).toBe("2026-09-01T00:00:00.000Z");
    }
  });

  it("round-trips without optional photo and wallet ids", () => {
    const text = serializeBackup({ card: makeCard() }, "2026-09-01T00:00:00.000Z");
    const parsed = parseBackup(text);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.backup.photo).toBeUndefined();
      expect(parsed.backup.walletIds).toBeUndefined();
    }
  });

  it("rejects non-JSON and non-backup files", () => {
    expect(parseBackup("not json at all")).toEqual({ ok: false, error: "not-json" });
    expect(parseBackup("{}")).toEqual({ ok: false, error: "not-backup" });
    expect(parseBackup(JSON.stringify({ format: "other" }))).toEqual({
      ok: false,
      error: "not-backup",
    });
    expect(parseBackup(JSON.stringify([1, 2]))).toEqual({ ok: false, error: "not-backup" });
  });

  it("rejects unsupported schema versions", () => {
    const text = JSON.stringify({ format: "byzcard-backup", schemaVersion: 999, card: {} });
    expect(parseBackup(text)).toEqual({ ok: false, error: "unsupported-version" });
  });

  it("rejects corrupted card data", () => {
    const card = makeCard();
    const doc = JSON.parse(serializeBackup({ card }, "now")) as Record<string, unknown>;
    (doc.card as Record<string, unknown>).email = "not-an-email";
    expect(parseBackup(JSON.stringify(doc))).toEqual({ ok: false, error: "invalid-card" });
  });

  it("rejects invalid photos (bad mime, bad base64, oversized)", () => {
    const card = makeCard();
    const base = JSON.parse(serializeBackup({ card }, "now")) as Record<string, unknown>;

    const badMime = {
      ...base,
      photo: { mimeType: "image/svg+xml", width: 1, height: 1, dataBase64: "QQ==" },
    };
    expect(parseBackup(JSON.stringify(badMime))).toEqual({ ok: false, error: "invalid-photo" });

    const badB64 = {
      ...base,
      photo: { mimeType: "image/jpeg", width: 1, height: 1, dataBase64: "!!" },
    };
    expect(parseBackup(JSON.stringify(badB64))).toEqual({ ok: false, error: "invalid-photo" });

    const badDims = {
      ...base,
      photo: { mimeType: "image/jpeg", width: 0, height: 1, dataBase64: "QQ==" },
    };
    expect(parseBackup(JSON.stringify(badDims))).toEqual({ ok: false, error: "invalid-photo" });
  });

  it("rejects files above the size cap without parsing them", () => {
    const huge = `{"pad":"${"x".repeat(BACKUP_FILE_MAX_BYTES)}"}`;
    expect(parseBackup(huge)).toEqual({ ok: false, error: "too-large" });
  });

  it("ignores unknown extra keys (forward compatibility)", () => {
    const doc = JSON.parse(serializeBackup({ card: makeCard() }, "now")) as Record<string, unknown>;
    doc.futureField = { nested: true };
    const parsed = parseBackup(JSON.stringify(doc));
    expect(parsed.ok).toBe(true);
  });

  it("generates .byzcard filenames", () => {
    expect(backupFilename("Ada Lovelace")).toBe("ada-lovelace.byzcard");
  });
});
