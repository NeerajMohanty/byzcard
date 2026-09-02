/**
 * Share URL construction and size budgeting.
 * The same URL feeds the on-card QR, the Wallet pass QR, and the NFC payload.
 */

/** Ideal ceiling for reliable phone-screen QR scanning. */
export const SHARE_URL_SOFT_LIMIT_BYTES = 400;
/** Hard product budget — encoding refuses beyond this. */
export const SHARE_URL_HARD_LIMIT_BYTES = 700;

export type ShareSizeLevel = "ok" | "warn" | "error";

export interface ShareSize {
  bytes: number;
  softLimit: number;
  hardLimit: number;
  level: ShareSizeLevel;
}

/** Build the recipient URL: `${origin}/s#${fragment}`. */
export function buildShareUrl(origin: string, fragment: string): string {
  const base = origin.replace(/\/+$/u, "");
  return `${base}/s#${fragment}`;
}

/** Extract the fragment from a share URL (or return null). */
export function fragmentOfShareUrl(url: string): string | null {
  const hashIndex = url.indexOf("#");
  if (hashIndex < 0) return null;
  return url.slice(hashIndex + 1);
}

/** Byte size of the URL (ASCII-safe: fragment is base64url). */
export function analyzeShareSize(url: string): ShareSize {
  const bytes = new TextEncoder().encode(url).length;
  const level: ShareSizeLevel =
    bytes > SHARE_URL_HARD_LIMIT_BYTES
      ? "error"
      : bytes > SHARE_URL_SOFT_LIMIT_BYTES
        ? "warn"
        : "ok";
  return {
    bytes,
    softLimit: SHARE_URL_SOFT_LIMIT_BYTES,
    hardLimit: SHARE_URL_HARD_LIMIT_BYTES,
    level,
  };
}
