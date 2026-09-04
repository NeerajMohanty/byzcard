import { describe, expect, it } from "vitest";
import { makeBackupFile } from "@/features/card/files";
import { buildCard, validateCardFields } from "@/core/card/validate";

function makeCard() {
  const validated = validateCardFields({
    fullName: "Ada Lovelace",
    role: "Chief Analyst",
    company: "Analytical Engines",
    phone: "+1 647 000 0000",
    email: "ada@example.com",
  });
  if (!validated.ok) throw new Error("fixture invalid");
  return buildCard(validated.fields);
}

const PHOTO_BYTES = 60_000;

describe("generated .byzcard backup file", () => {
  it("with photo: .byzcard name, format id, fields, photo bytes and crop", async () => {
    const blob = new Blob([new Uint8Array(PHOTO_BYTES).fill(7)], { type: "image/jpeg" });
    const file = await makeBackupFile(
      makeCard(),
      {
        blob,
        meta: { mimeType: "image/jpeg", width: 640, height: 800, byteSize: PHOTO_BYTES },
        crop: { x: 0.2, y: 0, zoom: 1.4 },
      },
      { appleSerialNumber: "abc123" },
    );
    expect(file.name).toBe("ada-lovelace.byzcard");
    expect(file.type).toBe("application/json");
    const doc = JSON.parse(await file.text()) as {
      format: string;
      card: { fullName: string; phone: string };
      photo?: { dataBase64: string };
      photoCrop?: unknown;
    };
    expect(doc.format).toBe("byzcard-backup");
    expect(doc.card.fullName).toBe("Ada Lovelace");
    expect(doc.card.phone).toBe("+1 647 000 0000");
    expect(doc.photo?.dataBase64.length).toBeGreaterThanOrEqual(Math.floor((PHOTO_BYTES * 4) / 3));
    expect(doc.photoCrop).toEqual({ x: 0.2, y: 0, zoom: 1.4 });
    // A real backup with a photo is tens of kilobytes — never 14 bytes.
    expect(file.size).toBeGreaterThan(PHOTO_BYTES);
  });

  it("without photo: compact but complete", async () => {
    const file = await makeBackupFile(makeCard(), null, {});
    expect(file.name).toBe("ada-lovelace.byzcard");
    const doc = JSON.parse(await file.text()) as { format: string; photo?: unknown };
    expect(doc.format).toBe("byzcard-backup");
    expect(doc.photo).toBeUndefined();
    expect(file.size).toBeGreaterThan(300);
    expect(file.size).toBeLessThan(2_000);
  });
});
