/**
 * Validation of Wallet signing request bodies (the only endpoints that ever
 * receive card data). Strict schema, size caps, PNG magic check. Nothing
 * from the request is persisted or logged.
 */
import type { CardFields } from "@/core/card/types";
import { validateCardFields } from "@/core/card/validate";

/** Whole request body limit (photo is base64 PNG). */
export const WALLET_REQUEST_MAX_BYTES = 1_200_000;
/** Decoded photo cap. */
export const WALLET_PHOTO_MAX_BYTES = 800_000;

export interface WalletRequest {
  fields: CardFields;
  serialNumber: string;
  /** Decoded PNG bytes, present only for Apple requests with a photo. */
  photoPng?: Uint8Array;
}

export type WalletRequestResult =
  | { ok: true; request: WalletRequest }
  | { ok: false; error: "invalid-body" | "invalid-fields" | "invalid-serial" | "invalid-photo" };

const SERIAL_RE = /^[a-f0-9]{16,64}$/u;

function isPng(bytes: Uint8Array): boolean {
  const magic = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  return magic.every((b, i) => bytes[i] === b);
}

export function parseWalletRequest(
  body: unknown,
  options: { allowPhoto: boolean },
): WalletRequestResult {
  if (typeof body !== "object" || body === null) return { ok: false, error: "invalid-body" };
  const record = body as Record<string, unknown>;

  if (typeof record.fields !== "object" || record.fields === null)
    return { ok: false, error: "invalid-body" };
  const validated = validateCardFields(record.fields as Record<string, unknown>);
  if (!validated.ok) return { ok: false, error: "invalid-fields" };

  const serialNumber = record.serialNumber;
  if (typeof serialNumber !== "string" || !SERIAL_RE.test(serialNumber))
    return { ok: false, error: "invalid-serial" };

  let photoPng: Uint8Array | undefined;
  if (options.allowPhoto && typeof record.photoBase64 === "string" && record.photoBase64 !== "") {
    if (!/^[A-Za-z0-9+/]+={0,2}$/u.test(record.photoBase64))
      return { ok: false, error: "invalid-photo" };
    const decoded = Uint8Array.from(Buffer.from(record.photoBase64, "base64"));
    if (decoded.length === 0 || decoded.length > WALLET_PHOTO_MAX_BYTES || !isPng(decoded))
      return { ok: false, error: "invalid-photo" };
    photoPng = decoded;
  }

  return { ok: true, request: { fields: validated.fields, serialNumber, photoPng } };
}
