/**
 * The landing example profile is real data run through the real share
 * pipeline: if it ever outgrows the QR budget, the landing page silently
 * loses its QR (useShareQr returns null past the hard limit). This holds
 * the demo profile inside the comfortable scanning budget.
 */
import { describe, expect, it } from "vitest";
import { EXAMPLE_CARD, EXAMPLE_SHARE_ORIGIN } from "@/features/landing/exampleData";
import { encodeSharePayload, decodeSharePayload } from "@/core/share/codec";
import { analyzeShareSize, buildShareUrl } from "@/core/share/url";
import { validateCardFields } from "@/core/card/validate";
import { encodeQrText } from "@/core/qr";

async function exampleShareUrl(): Promise<string> {
  const fragment = await encodeSharePayload(EXAMPLE_CARD);
  return buildShareUrl(EXAMPLE_SHARE_ORIGIN, fragment);
}

describe("landing example card", () => {
  it("is valid input for the real card validator", () => {
    const result = validateCardFields({ ...EXAMPLE_CARD });
    expect(result.ok).toBe(true);
  });

  it("populates the optional profile fields the landing demonstrates", () => {
    expect(EXAMPLE_CARD.preferredName).toBe("John");
    expect(EXAMPLE_CARD.pronouns).toBe("he/him");
    expect(EXAMPLE_CARD.headline).not.toBe("");
    expect(EXAMPLE_CARD.social).toHaveLength(1);
    expect(EXAMPLE_CARD.messaging).toHaveLength(1);
    expect(EXAMPLE_CARD.links).toHaveLength(1);
  });

  it("stays within the soft share-URL budget so the demo QR scans easily", async () => {
    const size = analyzeShareSize(await exampleShareUrl());
    expect(size.level).toBe("ok");
    expect(size.bytes).toBeLessThanOrEqual(size.softLimit);
  });

  it("round-trips through the share codec with every optional field intact", async () => {
    const fragment = await encodeSharePayload(EXAMPLE_CARD);
    const result = await decodeSharePayload(`#${fragment}`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload.preferredName).toBe("John");
    expect(result.payload.pronouns).toBe("he/him");
    expect(result.payload.headline).toBe(EXAMPLE_CARD.headline);
    expect(result.payload.social?.[0]?.service).toBe("linkedin");
    expect(result.payload.messaging?.[0]?.service).toBe("whatsapp");
    expect(result.payload.links?.[0]?.service).toBe("github");
  });

  it("encodes into a QR symbol", async () => {
    const symbol = encodeQrText(await exampleShareUrl(), { ecl: "M" });
    expect(symbol.size).toBeGreaterThan(0);
  });
});
