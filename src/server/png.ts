/**
 * Minimal PNG encoder (RGBA, 8-bit), server-only.
 * Used to generate the required Apple Wallet icon assets at pass-build time
 * so no binary image files live in the repository.
 */
import { deflateSync } from "node:zlib";
import { crc32 } from "./crc32";

function u32be(value: number): number[] {
  return [(value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff];
}

function chunk(type: string, data: Uint8Array): number[] {
  const typeBytes = [...type].map((c) => c.charCodeAt(0));
  const body = Uint8Array.from([...typeBytes, ...data]);
  return [...u32be(data.length), ...body, ...u32be(crc32(body))];
}

/** Encode RGBA pixels into a PNG file. */
export function encodePng(width: number, height: number, rgba: Uint8Array): Uint8Array {
  if (rgba.length !== width * height * 4) throw new RangeError("Pixel buffer size mismatch");
  // Scanlines with filter byte 0.
  const raw = new Uint8Array(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) {
    raw.set(rgba.subarray(y * width * 4, (y + 1) * width * 4), y * (width * 4 + 1) + 1);
  }
  const ihdr = Uint8Array.from([...u32be(width), ...u32be(height), 8, 6, 0, 0, 0]);
  const idat = Uint8Array.from(deflateSync(raw));
  return Uint8Array.from([
    0x89,
    0x50,
    0x4e,
    0x47,
    0x0d,
    0x0a,
    0x1a,
    0x0a,
    ...chunk("IHDR", ihdr),
    ...chunk("IDAT", idat),
    ...chunk("IEND", new Uint8Array(0)),
  ]);
}

/** Solid-color square PNG (the BYZCARD icon base). */
export function solidPng(size: number, r: number, g: number, b: number): Uint8Array {
  const rgba = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    rgba[i * 4] = r;
    rgba[i * 4 + 1] = g;
    rgba[i * 4 + 2] = b;
    rgba[i * 4 + 3] = 255;
  }
  return encodePng(size, size, rgba);
}
