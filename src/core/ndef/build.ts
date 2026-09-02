/**
 * NDEF URI record generation (NFC Forum URI RTD) and tag budget checks.
 * Pure byte construction — writing happens in the Web NFC adapter.
 */

/** NFC Forum URI identifier abbreviation codes (URI RTD §3.2.2). */
const URI_PREFIXES: readonly string[] = [
  "",
  "http://www.",
  "https://www.",
  "http://",
  "https://",
  "tel:",
  "mailto:",
];

/**
 * Usable NDEF message budgets in bytes for common tags: user memory minus
 * capability container/TLV overhead. NTAG213 (~137B) is deliberately absent —
 * it cannot hold a self-contained BYZCARD share URL.
 */
export const NFC_TAG_BUDGETS = {
  ntag215: 492,
  ntag216: 868,
} as const;

export interface NdefFit {
  bytes: number;
  fitsNtag215: boolean;
  fitsNtag216: boolean;
}

function choosePrefix(url: string): { code: number; rest: string } {
  let best = 0;
  for (let i = 1; i < URI_PREFIXES.length; i++) {
    const prefix = URI_PREFIXES[i] ?? "";
    if (prefix.length > (URI_PREFIXES[best]?.length ?? 0) && url.startsWith(prefix)) {
      best = i;
    }
  }
  return { code: best, rest: url.slice(URI_PREFIXES[best]?.length ?? 0) };
}

/**
 * Build a complete single-record NDEF message containing a URI record.
 * Uses the short-record form when the payload is under 256 bytes.
 */
export function buildNdefUriMessage(url: string): Uint8Array {
  const { code, rest } = choosePrefix(url);
  const restBytes = new TextEncoder().encode(rest);
  const payloadLength = restBytes.length + 1;
  const shortRecord = payloadLength < 256;

  // Header flags: MB | ME | SR? | TNF=0x01 (well-known).
  const header = 0x80 | 0x40 | (shortRecord ? 0x10 : 0x00) | 0x01;
  const bytes: number[] = [header, 0x01];
  if (shortRecord) {
    bytes.push(payloadLength);
  } else {
    bytes.push(
      (payloadLength >>> 24) & 0xff,
      (payloadLength >>> 16) & 0xff,
      (payloadLength >>> 8) & 0xff,
      payloadLength & 0xff,
    );
  }
  bytes.push(0x55); // type 'U'
  bytes.push(code);
  return Uint8Array.from([...bytes, ...restBytes]);
}

/** Byte size of the NDEF message for a URL. */
export function ndefMessageSize(url: string): number {
  return buildNdefUriMessage(url).length;
}

/** Check whether the message fits common tag budgets. */
export function checkNdefFit(url: string): NdefFit {
  const bytes = ndefMessageSize(url);
  return {
    bytes,
    fitsNtag215: bytes <= NFC_TAG_BUDGETS.ntag215,
    fitsNtag216: bytes <= NFC_TAG_BUDGETS.ntag216,
  };
}
