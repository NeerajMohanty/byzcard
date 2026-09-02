/**
 * Public QR API: encode text or bytes into a module matrix.
 * Byte mode only — every BYZCARD payload (URLs, vCards) is arbitrary UTF-8,
 * so byte mode is the single correct general mode.
 */
import { buildCodewords, selectVersion } from "./encode";
import { buildSymbol, type QrSymbol } from "./matrix";
import type { EccLevel } from "./tables";

export { QrDataTooLongError } from "./encode";
export type { QrSymbol } from "./matrix";
export type { EccLevel } from "./tables";
export { byteModeCapacity } from "./tables";

export interface QrOptions {
  /** Error correction level. Default M — right for screen-displayed QR. */
  ecl?: EccLevel;
  /** Minimum symbol version (1–40). */
  minVersion?: number;
}

/** Encode raw bytes into a QR symbol. Throws QrDataTooLongError if too big. */
export function encodeQrBytes(data: Uint8Array, options: QrOptions = {}): QrSymbol {
  const ecl = options.ecl ?? "M";
  const version = selectVersion(data.length, ecl, options.minVersion ?? 1);
  const codewords = buildCodewords(data, version, ecl);
  return buildSymbol(codewords, version, ecl);
}

/** Encode text (UTF-8) into a QR symbol. */
export function encodeQrText(text: string, options: QrOptions = {}): QrSymbol {
  return encodeQrBytes(new TextEncoder().encode(text), options);
}

/** Render a symbol as an SVG path string ("M1 2h1v1h-1z…") for crisp display. */
export function qrToSvgPath(symbol: QrSymbol): string {
  const parts: string[] = [];
  for (let y = 0; y < symbol.size; y++) {
    const row = symbol.modules[y];
    if (row === undefined) continue;
    let x = 0;
    while (x < symbol.size) {
      if (row[x] === true) {
        let runEnd = x;
        while (runEnd < symbol.size && row[runEnd] === true) runEnd += 1;
        parts.push(`M${x} ${y}h${runEnd - x}v1h-${runEnd - x}z`);
        x = runEnd;
      } else {
        x += 1;
      }
    }
  }
  return parts.join("");
}

/**
 * Rasterize a symbol into RGBA pixels (dark = black, light = white) with a
 * quiet zone — used by tests for independent decoding and by PNG rendering.
 */
export function qrToRgba(
  symbol: QrSymbol,
  scale: number,
  quietZone = 4,
): { data: Uint8ClampedArray; width: number; height: number } {
  const sizePx = (symbol.size + quietZone * 2) * scale;
  const data = new Uint8ClampedArray(sizePx * sizePx * 4).fill(255);
  for (let y = 0; y < symbol.size; y++) {
    for (let x = 0; x < symbol.size; x++) {
      if (symbol.modules[y]?.[x] !== true) continue;
      for (let dy = 0; dy < scale; dy++) {
        const py = (y + quietZone) * scale + dy;
        for (let dx = 0; dx < scale; dx++) {
          const px = (x + quietZone) * scale + dx;
          const idx = (py * sizePx + px) * 4;
          data[idx] = 0;
          data[idx + 1] = 0;
          data[idx + 2] = 0;
        }
      }
    }
  }
  return { data, width: sizePx, height: sizePx };
}
