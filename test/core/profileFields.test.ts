import { describe, expect, it } from "vitest";
import { buildCard, isStoredCard, validateCardFields } from "@/core/card/validate";
import { decodeSharePayload, encodeSharePayload } from "@/core/share/codec";
import { buildVcard } from "@/core/vcard/build";
import { parseBackup, serializeBackup } from "@/core/backup/codec";

const BASE = {
  fullName: "Ada Lovelace",
  role: "Chief Analyst",
  company: "Analytical Engines",
  phone: "+1 647 000 0000",
  email: "ada@example.com",
};

const EXTRAS = {
  preferredName: "Ada",
  pronouns: "she/her",
  headline: "Analytical Engines · Computing Pioneer",
  social: [
    { service: "linkedin", value: "linkedin.com/in/ada" },
    { service: "x", value: "https://x.com/ada" },
  ],
  messaging: [{ service: "whatsapp", value: "wa.me/16470000000" }],
  links: [{ service: "github", value: "github.com/ada" }],
};

function validOrThrow(input: Record<string, unknown>) {
  const result = validateCardFields(input);
  if (!result.ok) throw new Error(`fixture invalid: ${JSON.stringify(result.issues)}`);
  return result.fields;
}

describe("optional profile fields — validation", () => {
  it("normalizes and returns every optional field", () => {
    const fields = validOrThrow({ ...BASE, ...EXTRAS });
    expect(fields.preferredName).toBe("Ada");
    expect(fields.pronouns).toBe("she/her");
    expect(fields.headline).toContain("Pioneer");
    expect(fields.social?.[0]).toEqual({
      service: "linkedin",
      value: "https://linkedin.com/in/ada",
    });
    expect(fields.messaging?.[0]?.value).toBe("https://wa.me/16470000000");
    expect(fields.links?.[0]?.value).toBe("https://github.com/ada");
  });

  it("keeps blank optional fields absent", () => {
    const fields = validOrThrow({
      ...BASE,
      preferredName: "",
      pronouns: "",
      headline: "",
      social: [],
      messaging: [],
      links: [],
    });
    expect(fields.preferredName).toBeUndefined();
    expect(fields.pronouns).toBeUndefined();
    expect(fields.headline).toBeUndefined();
    expect(fields.social).toBeUndefined();
    expect(fields.messaging).toBeUndefined();
    expect(fields.links).toBeUndefined();
  });

  it("caps entries per group, rejects bad URLs and unknown services", () => {
    const tooMany = validateCardFields({
      ...BASE,
      social: [1, 2, 3, 4].map((i) => ({ service: "x", value: `https://x.com/${i}` })),
    });
    expect(tooMany.ok).toBe(false);
    expect(
      validateCardFields({ ...BASE, links: [{ service: "github", value: "no spaces allowed" }] })
        .ok,
    ).toBe(false);
    expect(
      validateCardFields({ ...BASE, links: [{ service: "paypal", value: "https://x.com" }] }).ok,
    ).toBe(false);
  });

  it("old cards without the new fields still validate and store", () => {
    const card = buildCard(validOrThrow(BASE));
    expect(isStoredCard(card)).toBe(true);
    const withExtras = buildCard(validOrThrow({ ...BASE, ...EXTRAS }));
    expect(isStoredCard(withExtras)).toBe(true);
  });
});

describe("SharePayloadV2", () => {
  it("emits V1 when no optional fields are set (old links stay stable)", async () => {
    const decoded = await decodeSharePayload(await encodeSharePayload(validOrThrow(BASE)));
    expect(decoded.ok).toBe(true);
    if (decoded.ok) expect(decoded.payload.version).toBe(1);
  });

  it("round-trips all optional fields as V2 within the byte budget", async () => {
    const fields = validOrThrow({ ...BASE, ...EXTRAS });
    const fragment = await encodeSharePayload(fields);
    // Full share URL must stay under the 700-byte hard ceiling.
    expect(`https://byzcard.cc/s#${fragment}`.length).toBeLessThan(700);
    const decoded = await decodeSharePayload(fragment);
    expect(decoded.ok).toBe(true);
    if (decoded.ok) {
      expect(decoded.payload.version).toBe(2);
      expect(decoded.payload.fullName).toBe("Ada Lovelace");
      expect(decoded.payload.preferredName).toBe("Ada");
      expect(decoded.payload.pronouns).toBe("she/her");
      expect(decoded.payload.headline).toContain("Pioneer");
      expect(decoded.payload.social).toHaveLength(2);
      expect(decoded.payload.messaging?.[0]).toEqual({
        service: "whatsapp",
        value: "https://wa.me/16470000000",
      });
      expect(decoded.payload.links?.[0]?.service).toBe("github");
    }
  });
});

describe("vCard with profile fields", () => {
  it("maps preferred name to NICKNAME and entries to labeled URL items", () => {
    const vcf = buildVcard(validOrThrow({ ...BASE, ...EXTRAS }));
    expect(vcf).toContain("FN:Ada Lovelace"); // FN stays canonical
    expect(vcf).toContain("NICKNAME:Ada");
    expect(vcf).toContain("X-ABLabel:GitHub");
    expect(vcf).toContain("X-ABLabel:WhatsApp");
    expect(vcf).toContain("https://x.com/ada");
    expect(vcf).not.toContain("she/her"); // pronouns are not forced into vCard
  });
});

describe("backup with profile fields", () => {
  it("round-trips every new field; old backups stay valid", () => {
    const card = buildCard(validOrThrow({ ...BASE, ...EXTRAS }));
    const parsed = parseBackup(serializeBackup({ card }, "2026-09-02T00:00:00.000Z"));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.backup.card.preferredName).toBe("Ada");
      expect(parsed.backup.card.pronouns).toBe("she/her");
      expect(parsed.backup.card.social).toHaveLength(2);
      expect(parsed.backup.card.links?.[0]?.value).toBe("https://github.com/ada");
    }
    const legacy = parseBackup(
      serializeBackup({ card: buildCard(validOrThrow(BASE)) }, "2026-09-02T00:00:00.000Z"),
    );
    expect(legacy.ok).toBe(true);
  });
});
