/**
 * Stateless Google Wallet signing endpoint.
 * receive card → validate → build + sign save JWT → return URL → discard.
 * No database, no persistence, no logging of card data, no caching.
 */
import { encodeSharePayload } from "@/core/share/codec";
import { analyzeShareSize, buildShareUrl } from "@/core/share/url";
import { appUrl, googleWalletConfig } from "@/server/env";
import { errorJson, noStoreJson, originAllowed, readJsonBody } from "@/server/http";
import { buildGoogleSaveUrl } from "@/server/google/jwt";
import { parseWalletRequest } from "@/server/walletRequest";

export const dynamic = "force-dynamic";

/** Google requests carry no photo; a smaller body limit applies. */
const GOOGLE_REQUEST_MAX_BYTES = 32_000;

export async function POST(request: Request): Promise<Response> {
  const config = googleWalletConfig();
  if (config === null) return errorJson(503, "google-wallet-not-configured");
  if (!originAllowed(request, appUrl())) return errorJson(403, "origin-not-allowed");

  const body = await readJsonBody(request, GOOGLE_REQUEST_MAX_BYTES);
  if (body === null) return errorJson(400, "invalid-body");
  const parsed = parseWalletRequest(body, { allowPhoto: false });
  if (!parsed.ok) return errorJson(400, parsed.error);

  const origin = appUrl();
  const fragment = await encodeSharePayload(parsed.request.fields);
  const shareUrl = buildShareUrl(origin, fragment);
  if (analyzeShareSize(shareUrl).level === "error") return errorJson(400, "payload-too-large");

  let saveUrl: string;
  try {
    saveUrl = buildGoogleSaveUrl({
      config,
      fields: parsed.request.fields,
      shareUrl,
      objectSuffix: parsed.request.serialNumber,
      appOrigin: new URL(origin).origin,
    });
  } catch {
    return errorJson(500, "jwt-build-failed");
  }

  return noStoreJson({ saveUrl });
}
