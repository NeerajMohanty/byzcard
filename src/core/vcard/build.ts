/**
 * vCard 3.0 generation (RFC 2426). Pure functions — no DOM, no I/O.
 * vCard 3.0 is used (not 4.0) because iOS and Android contact apps have the
 * most reliable import behavior with 3.0, including embedded base64 photos.
 */
import { linkEntryLabel, type CardFields, type LinkGroup } from "../card/types";

const CRLF = "\r\n";
/** Maximum octets per line before folding (RFC 2426 §2.6). */
const FOLD_AT = 75;

export interface VcardPhoto {
  /** image/jpeg or image/png */
  mimeType: string;
  /** Raw base64 (no data: prefix). */
  base64: string;
}

/** Escape a text value per RFC 2426 §2.4.2 (order matters: backslash first). */
export function escapeVcardText(value: string): string {
  return value
    .replace(/\\/gu, "\\\\")
    .replace(/;/gu, "\\;")
    .replace(/,/gu, "\\,")
    .replace(/\r?\n/gu, "\\n");
}

/** Fold a content line at 75 octets, continuing with CRLF + single space. */
export function foldVcardLine(line: string): string {
  const encoder = new TextEncoder();
  const out: string[] = [];
  let current = "";
  let currentBytes = 0;
  const limit = (chunkStart: boolean): number => (chunkStart ? FOLD_AT : FOLD_AT - 1);
  for (const ch of line) {
    const chBytes = encoder.encode(ch).length;
    if (currentBytes + chBytes > limit(out.length === 0)) {
      out.push(current);
      current = "";
      currentBytes = 0;
    }
    current += ch;
    currentBytes += chBytes;
  }
  if (current !== "") out.push(current);
  return out.join(`${CRLF} `);
}

function splitName(fullName: string): { family: string; given: string } {
  const parts = fullName.trim().split(/\s+/u);
  if (parts.length === 1) return { family: "", given: parts[0] ?? "" };
  const family = parts[parts.length - 1] ?? "";
  const given = parts.slice(0, -1).join(" ");
  return { family, given };
}

function photoTypeParam(mimeType: string): string {
  return mimeType === "image/png" ? "PNG" : "JPEG";
}

/** Build a complete vCard 3.0 document with CRLF line endings. */
export function buildVcard(fields: CardFields, photo?: VcardPhoto): string {
  const { family, given } = splitName(fields.fullName);
  const lines: string[] = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${escapeVcardText(family)};${escapeVcardText(given)};;;`,
    `FN:${escapeVcardText(fields.fullName)}`,
    `ORG:${escapeVcardText(fields.company)}`,
    `TITLE:${escapeVcardText(fields.role)}`,
    `TEL;TYPE=CELL:${escapeVcardText(fields.phone)}`,
    `EMAIL;TYPE=INTERNET:${escapeVcardText(fields.email)}`,
  ];
  if (fields.preferredName !== undefined) {
    // Preferred name maps to NICKNAME; FN stays the canonical full name.
    lines.push(`NICKNAME:${escapeVcardText(fields.preferredName)}`);
  }
  if (fields.website !== undefined) lines.push(`URL:${escapeVcardText(fields.website)}`);
  let item = 0;
  if (fields.linkedin !== undefined) {
    item += 1;
    lines.push(`item${item}.URL:${escapeVcardText(fields.linkedin)}`);
    lines.push(`item${item}.X-ABLabel:LinkedIn`);
  }
  // Optional social/messaging/link entries as labeled URL items (all values
  // are normalized https URLs, so this stays standards-safe vCard 3.0).
  for (const group of ["social", "messaging", "links"] as LinkGroup[]) {
    for (const entry of fields[group] ?? []) {
      item += 1;
      lines.push(`item${item}.URL:${escapeVcardText(entry.value)}`);
      lines.push(`item${item}.X-ABLabel:${escapeVcardText(linkEntryLabel(group, entry))}`);
    }
  }
  if (photo !== undefined) {
    lines.push(`PHOTO;ENCODING=b;TYPE=${photoTypeParam(photo.mimeType)}:${photo.base64}`);
  }
  lines.push("END:VCARD");
  return lines.map(foldVcardLine).join(CRLF) + CRLF;
}

/** "firstname-lastname.vcf" style filename, unicode-safe. */
export function vcardFilename(fullName: string): string {
  return `${slugifyName(fullName)}.vcf`;
}

export function slugifyName(fullName: string): string {
  const slug = fullName
    .trim()
    .toLocaleLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/gu, "");
  return slug === "" ? "card" : slug;
}
