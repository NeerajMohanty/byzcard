/**
 * Minimal ZIP writer (stored entries, no compression), server-only.
 * A .pkpass is a ZIP archive; entries are small (JSON + PNG) so the stored
 * method keeps this dependency-free and deterministic.
 */
import { crc32 } from "./crc32";

export interface ZipEntry {
  name: string;
  data: Uint8Array;
}

function u16(value: number): number[] {
  return [value & 0xff, (value >>> 8) & 0xff];
}

function u32(value: number): number[] {
  return [value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff];
}

/** Fixed DOS timestamp (2026-01-01 00:00) keeps archives deterministic. */
const DOS_TIME = 0;
const DOS_DATE = ((2026 - 1980) << 9) | (1 << 5) | 1;

/** Build a complete ZIP archive from entries. */
export function buildZip(entries: readonly ZipEntry[]): Uint8Array {
  const chunks: number[] = [];
  const central: number[] = [];
  const encoder = new TextEncoder();

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const crc = crc32(entry.data);
    const offset = chunks.length;

    chunks.push(
      ...u32(0x04034b50),
      ...u16(20), // version needed
      ...u16(0), // flags
      ...u16(0), // method: stored
      ...u16(DOS_TIME),
      ...u16(DOS_DATE),
      ...u32(crc),
      ...u32(entry.data.length),
      ...u32(entry.data.length),
      ...u16(nameBytes.length),
      ...u16(0), // extra length
      ...nameBytes,
      ...entry.data,
    );

    central.push(
      ...u32(0x02014b50),
      ...u16(20), // version made by
      ...u16(20), // version needed
      ...u16(0),
      ...u16(0),
      ...u16(DOS_TIME),
      ...u16(DOS_DATE),
      ...u32(crc),
      ...u32(entry.data.length),
      ...u32(entry.data.length),
      ...u16(nameBytes.length),
      ...u16(0),
      ...u16(0), // comment length
      ...u16(0), // disk number
      ...u16(0), // internal attrs
      ...u32(0), // external attrs
      ...u32(offset),
      ...nameBytes,
    );
  }

  const centralOffset = chunks.length;
  chunks.push(...central);
  chunks.push(
    ...u32(0x06054b50),
    ...u16(0),
    ...u16(0),
    ...u16(entries.length),
    ...u16(entries.length),
    ...u32(central.length),
    ...u32(centralOffset),
    ...u16(0),
  );
  return Uint8Array.from(chunks);
}
