/**
 * Stateless Apple Wallet signing endpoint.
 * receive card → validate → build + sign pass in memory → return → discard.
 * No database, no persistence, no logging of card data, no caching.
 */
import { encodeSharePayload } from "@/core/share/codec";
import { analyzeShareSize, buildShareUrl } from "@/core/share/url";
import { buildPkpass } from "@/server/apple/pass";
import { appUrl, appleWalletConfig } from "@/server/env";
import {
  NO_STORE_HEADERS,
  errorJson,
  isJsonContentType,
  originAllowed,
  readJsonBody,
} from "@/server/http";
import { WALLET_REQUEST_MAX_BYTES, parseWalletRequest } from "@/server/walletRequest";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const config = appleWalletConfig();
  if (config === null) return errorJson(503, "apple-wallet-not-configured");
  if (!originAllowed(request, appUrl())) return errorJson(403, "origin-not-allowed");
  if (!isJsonContentType(request)) return errorJson(415, "unsupported-content-type");

  const body = await readJsonBody(request, WALLET_REQUEST_MAX_BYTES);
  if (body === null) return errorJson(400, "invalid-body");
  const parsed = parseWalletRequest(body, { allowPhoto: true });
  if (!parsed.ok) return errorJson(400, parsed.error);

  // The share URL is re-derived server-side from the validated fields, so
  // the pass QR can never contain attacker-chosen content.
  const fragment = await encodeSharePayload(parsed.request.fields);
  const shareUrl = buildShareUrl(appUrl(), fragment);
  if (analyzeShareSize(shareUrl).level === "error") return errorJson(400, "payload-too-large");

  let pkpass: Uint8Array;
  try {
    pkpass = buildPkpass({
      config,
      fields: parsed.request.fields,
      shareUrl,
      serialNumber: parsed.request.serialNumber,
      photoPng: parsed.request.photoPng,
    });
  } catch {
    // Never log the request; the failure reason is configuration-shaped.
    return errorJson(500, "pass-build-failed");
  }

  return new Response(Buffer.from(pkpass), {
    status: 200,
    headers: {
      ...NO_STORE_HEADERS,
      "Content-Type": "application/vnd.apple.pkpass",
      "Content-Disposition": 'attachment; filename="byzcard.pkpass"',
    },
  });
}
