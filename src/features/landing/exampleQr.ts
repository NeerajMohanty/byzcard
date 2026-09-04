import { cache } from "react";
import { encodeQrText, type QrSymbol } from "@/core/qr";
import { encodeSharePayload } from "@/core/share/codec";
import { buildShareUrl } from "@/core/share/url";
import { EXAMPLE_CARD, EXAMPLE_SHARE_ORIGIN } from "./exampleData";

/**
 * The one landing demo QR. The demo card is static, so the symbol is computed
 * on the server — once per render thanks to `cache`, and effectively once
 * ever, since the landing page is prerendered — and handed to every visual
 * that shows it. The browser never encodes this QR. Inputs are identical to
 * what the old per-component hooks produced, so the symbol is bit-identical.
 */
export const exampleQr = cache(async (): Promise<QrSymbol> => {
  const fragment = await encodeSharePayload(EXAMPLE_CARD);
  return encodeQrText(buildShareUrl(EXAMPLE_SHARE_ORIGIN, fragment), { ecl: "M" });
});
