/**
 * Byte-level helpers for the share codec: UTF-8, base64url, deflate-raw.
 * Pure + platform-portable: uses only Web-standard globals that exist in
 * both modern browsers and Node 18+ (TextEncoder, CompressionStream).
 */

const B64URL_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

export function utf8Encode(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

export function utf8Decode(bytes: Uint8Array): string {
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

/** RFC 4648 base64url without padding. */
export function base64UrlEncode(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i] ?? 0;
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];
    out += B64URL_ALPHABET[b0 >> 2];
    out += B64URL_ALPHABET[((b0 & 0x03) << 4) | ((b1 ?? 0) >> 4)];
    if (b1 === undefined) break;
    out += B64URL_ALPHABET[((b1 & 0x0f) << 2) | ((b2 ?? 0) >> 6)];
    if (b2 === undefined) break;
    out += B64URL_ALPHABET[b2 & 0x3f];
  }
  return out;
}

export function base64UrlDecode(text: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]*$/u.test(text) || text.length % 4 === 1) return null;
  const out = new Uint8Array(Math.floor((text.length * 3) / 4));
  let outIdx = 0;
  let buffer = 0;
  let bits = 0;
  for (const ch of text) {
    const value = B64URL_ALPHABET.indexOf(ch);
    if (value < 0) return null;
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[outIdx] = (buffer >> bits) & 0xff;
      outIdx += 1;
    }
  }
  return out.subarray(0, outIdx);
}

const B64_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/** Standard base64 with padding (for vCard photos, backups, Wallet bodies). */
export function bytesToBase64(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i] ?? 0;
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];
    out += B64_ALPHABET[b0 >> 2];
    out += B64_ALPHABET[((b0 & 0x03) << 4) | ((b1 ?? 0) >> 4)];
    out += b1 === undefined ? "=" : B64_ALPHABET[((b1 & 0x0f) << 2) | ((b2 ?? 0) >> 6)];
    out += b1 === undefined || b2 === undefined ? "=" : B64_ALPHABET[b2 & 0x3f];
  }
  return out;
}

export function base64ToBytes(text: string): Uint8Array | null {
  if (!/^[A-Za-z0-9+/]*={0,2}$/u.test(text) || text.length % 4 !== 0) return null;
  const clean = text.replace(/=+$/u, "");
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let outIdx = 0;
  let buffer = 0;
  let bits = 0;
  for (const ch of clean) {
    const value = B64_ALPHABET.indexOf(ch);
    if (value < 0) return null;
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[outIdx] = (buffer >> bits) & 0xff;
      outIdx += 1;
    }
  }
  return out.subarray(0, outIdx);
}

export function compressionSupported(): boolean {
  return typeof CompressionStream !== "undefined";
}

export function decompressionSupported(): boolean {
  return typeof DecompressionStream !== "undefined";
}

async function pumpThrough(
  bytes: Uint8Array,
  transform: { readable: ReadableStream<Uint8Array>; writable: WritableStream<BufferSource> },
): Promise<Uint8Array> {
  const writer = transform.writable.getWriter();
  let writeError: unknown = null;
  // Observe the write promise immediately so a failing stream (e.g. corrupt
  // deflate data) never produces an unhandled rejection.
  const writing = writer
    .write(bytes.slice())
    .then(() => writer.close())
    .catch((error: unknown) => {
      writeError = error;
    });
  const chunks: Uint8Array[] = [];
  const reader = transform.readable.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  await writing;
  if (writeError !== null) throw writeError;
  const total = chunks.reduce((sum, c) => sum + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

export async function deflateRaw(bytes: Uint8Array): Promise<Uint8Array> {
  return pumpThrough(bytes, new CompressionStream("deflate-raw"));
}

export async function inflateRaw(bytes: Uint8Array): Promise<Uint8Array> {
  return pumpThrough(bytes, new DecompressionStream("deflate-raw"));
}
