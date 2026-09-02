/**
 * Minimal DER (ASN.1) encoding + targeted decoding, server-only.
 * Exists so Apple Wallet CMS signing needs zero external dependencies:
 * Node's crypto can produce RSA signatures but has no PKCS#7 container
 * support, so BYZCARD assembles the CMS structure itself.
 */

export const OID = {
  pkcs7Data: "1.2.840.113549.1.7.1",
  pkcs7SignedData: "1.2.840.113549.1.7.2",
  sha256: "2.16.840.1.101.3.4.2.1",
  rsaEncryption: "1.2.840.113549.1.1.1",
  contentType: "1.2.840.113549.1.9.3",
  messageDigest: "1.2.840.113549.1.9.4",
  signingTime: "1.2.840.113549.1.9.5",
} as const;

function encodeLength(length: number): number[] {
  if (length < 0x80) return [length];
  const bytes: number[] = [];
  let remaining = length;
  while (remaining > 0) {
    bytes.unshift(remaining & 0xff);
    remaining >>>= 8;
  }
  return [0x80 | bytes.length, ...bytes];
}

/** Encode a TLV with the given tag byte. */
export function derTlv(tag: number, content: Uint8Array): Uint8Array {
  const header = Uint8Array.from([tag, ...encodeLength(content.length)]);
  const out = new Uint8Array(header.length + content.length);
  out.set(header, 0);
  out.set(content, header.length);
  return out;
}

export function derConcat(parts: readonly Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, p) => sum + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

export function derSequence(...parts: Uint8Array[]): Uint8Array {
  return derTlv(0x30, derConcat(parts));
}

/** SET OF with DER canonical ordering (sorted by encoded bytes). */
export function derSetOf(elements: readonly Uint8Array[]): Uint8Array {
  const sorted = [...elements].sort(compareBytes);
  return derTlv(0x31, derConcat(sorted));
}

/** Context-specific constructed tag [n], implicit content. */
export function derContextImplicit(tagNumber: number, content: Uint8Array): Uint8Array {
  return derTlv(0xa0 | tagNumber, content);
}

export function derInteger(value: number): Uint8Array {
  if (!Number.isInteger(value) || value < 0 || value > 0x7fffffff)
    throw new RangeError("Unsupported integer");
  const bytes: number[] = [];
  let remaining = value;
  do {
    bytes.unshift(remaining & 0xff);
    remaining >>>= 8;
  } while (remaining > 0);
  if (((bytes[0] ?? 0) & 0x80) !== 0) bytes.unshift(0);
  return derTlv(0x02, Uint8Array.from(bytes));
}

/** INTEGER from raw content bytes (e.g. a certificate serial). */
export function derIntegerBytes(content: Uint8Array): Uint8Array {
  return derTlv(0x02, content);
}

export function derOid(oid: string): Uint8Array {
  const arcs = oid.split(".").map((a) => Number.parseInt(a, 10));
  if (arcs.length < 2 || arcs.some((a) => !Number.isInteger(a) || a < 0))
    throw new RangeError(`Invalid OID: ${oid}`);
  const first = (arcs[0] ?? 0) * 40 + (arcs[1] ?? 0);
  const bytes: number[] = [first];
  for (const arc of arcs.slice(2)) {
    const chunk: number[] = [arc & 0x7f];
    let remaining = Math.floor(arc / 128);
    while (remaining > 0) {
      chunk.unshift((remaining & 0x7f) | 0x80);
      remaining = Math.floor(remaining / 128);
    }
    bytes.push(...chunk);
  }
  return derTlv(0x06, Uint8Array.from(bytes));
}

export function derNull(): Uint8Array {
  return derTlv(0x05, new Uint8Array(0));
}

export function derOctetString(content: Uint8Array): Uint8Array {
  return derTlv(0x04, content);
}

export function derUtcTime(date: Date): Uint8Array {
  const pad = (n: number): string => String(n).padStart(2, "0");
  const text =
    pad(date.getUTCFullYear() % 100) +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) +
    "Z";
  return derTlv(0x17, new TextEncoder().encode(text));
}

function compareBytes(a: Uint8Array, b: Uint8Array): number {
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return a.length - b.length;
}

// ── Targeted decoding ────────────────────────────────────────────────

interface Tlv {
  tag: number;
  /** Offset of the first content byte. */
  contentStart: number;
  contentLength: number;
  /** Offset just past the entire TLV. */
  end: number;
}

function readTlv(bytes: Uint8Array, offset: number): Tlv {
  const tag = bytes[offset];
  const first = bytes[offset + 1];
  if (tag === undefined || first === undefined) throw new RangeError("Truncated DER");
  let contentStart = offset + 2;
  let contentLength = first;
  if ((first & 0x80) !== 0) {
    const numBytes = first & 0x7f;
    if (numBytes === 0 || numBytes > 4) throw new RangeError("Unsupported DER length");
    contentLength = 0;
    for (let i = 0; i < numBytes; i++) {
      const b = bytes[offset + 2 + i];
      if (b === undefined) throw new RangeError("Truncated DER length");
      contentLength = contentLength * 256 + b;
    }
    contentStart = offset + 2 + numBytes;
  }
  const end = contentStart + contentLength;
  if (end > bytes.length) throw new RangeError("Truncated DER content");
  return { tag, contentStart, contentLength, end };
}

export interface IssuerAndSerial {
  /** Raw DER of the issuer Name element. */
  issuerDer: Uint8Array;
  /** Raw content bytes of the serialNumber INTEGER. */
  serialContent: Uint8Array;
}

/** Extract issuer Name and serial number from an X.509 certificate (DER). */
export function extractIssuerAndSerial(certDer: Uint8Array): IssuerAndSerial {
  const cert = readTlv(certDer, 0); // Certificate SEQUENCE
  const tbs = readTlv(certDer, cert.contentStart); // tbsCertificate SEQUENCE
  let cursor = tbs.contentStart;
  let field = readTlv(certDer, cursor);
  if (field.tag === 0xa0) {
    // Optional [0] EXPLICIT version — skip it.
    cursor = field.end;
    field = readTlv(certDer, cursor);
  }
  if (field.tag !== 0x02) throw new RangeError("Certificate serial not found");
  const serialContent = certDer.subarray(field.contentStart, field.end);
  cursor = field.end;
  const sigAlg = readTlv(certDer, cursor); // signature AlgorithmIdentifier
  const issuer = readTlv(certDer, sigAlg.end); // issuer Name
  if (issuer.tag !== 0x30) throw new RangeError("Certificate issuer not found");
  const issuerStart = sigAlg.end;
  return {
    issuerDer: certDer.subarray(issuerStart, issuer.end),
    serialContent,
  };
}

/** Decode all PEM blocks of a given label into DER byte arrays. */
export function pemToDer(pem: string, label: string): Uint8Array[] {
  const pattern = new RegExp(
    `-----BEGIN ${label}-----([A-Za-z0-9+/=\\s]+?)-----END ${label}-----`,
    "gu",
  );
  const results: Uint8Array[] = [];
  for (const match of pem.matchAll(pattern)) {
    const body = (match[1] ?? "").replace(/\s+/gu, "");
    results.push(Uint8Array.from(Buffer.from(body, "base64")));
  }
  return results;
}
