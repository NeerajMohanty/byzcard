/**
 * Generates the BYZCARD app icons (PWA + apple-touch) as repository-local
 * PNGs from the same design as src/app/icon.svg — navy rounded square,
 * card outline, portrait circle, two text bars.
 *
 * Run:  node scripts/generate-icons.mjs
 *
 * Self-contained on Node built-ins (zlib deflate + hand-rolled PNG
 * chunks); no image libraries, no network. Output is committed so the
 * app has zero runtime icon generation.
 */
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";

const NAVY = [11, 18, 32];
const LIGHT = [232, 234, 240];
const MUTED = [148, 163, 184];

// ── PNG encoding (RGBA, 8-bit) ───────────────────────────────────────

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let k = 0; k < 8; k++) crc = (crc & 1) !== 0 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function u32be(value) {
  return [(value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff];
}

function chunk(type, data) {
  const body = Uint8Array.from([...[...type].map((c) => c.charCodeAt(0)), ...data]);
  return [...u32be(data.length), ...body, ...u32be(crc32(body))];
}

function encodePng(size, rgba) {
  const raw = new Uint8Array(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw.set(rgba.subarray(y * size * 4, (y + 1) * size * 4), y * (size * 4 + 1) + 1);
  }
  const ihdr = Uint8Array.from([...u32be(size), ...u32be(size), 8, 6, 0, 0, 0]);
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
    ...chunk("IDAT", Uint8Array.from(deflateSync(raw))),
    ...chunk("IEND", new Uint8Array(0)),
  ]);
}

// ── Shape rasterizer (drawn at 4x, box-downsampled for smooth edges) ──

function makeCanvas(size) {
  return { size, rgba: new Uint8Array(size * size * 4) };
}

function put(canvas, x, y, [r, g, b]) {
  if (x < 0 || y < 0 || x >= canvas.size || y >= canvas.size) return;
  const i = (y * canvas.size + x) * 4;
  canvas.rgba[i] = r;
  canvas.rgba[i + 1] = g;
  canvas.rgba[i + 2] = b;
  canvas.rgba[i + 3] = 255;
}

function fillRoundedRect(canvas, x, y, w, h, radius, color) {
  const r = Math.min(radius, w / 2, h / 2);
  for (let py = Math.floor(y); py < y + h; py++) {
    for (let px = Math.floor(x); px < x + w; px++) {
      const cx = px < x + r ? x + r : px > x + w - r ? x + w - r : px;
      const cy = py < y + r ? y + r : py > y + h - r ? y + h - r : py;
      if ((px - cx) ** 2 + (py - cy) ** 2 <= r * r || (cx === px && cy === py)) {
        put(canvas, px, py, color);
      }
    }
  }
}

function fillCircle(canvas, cx, cy, radius, color) {
  for (let py = Math.floor(cy - radius); py <= cy + radius; py++) {
    for (let px = Math.floor(cx - radius); px <= cx + radius; px++) {
      if ((px - cx) ** 2 + (py - cy) ** 2 <= radius * radius) put(canvas, px, py, color);
    }
  }
}

function downsample(canvas, factor) {
  const outSize = canvas.size / factor;
  const out = new Uint8Array(outSize * outSize * 4);
  for (let y = 0; y < outSize; y++) {
    for (let x = 0; x < outSize; x++) {
      const sums = [0, 0, 0, 0];
      for (let dy = 0; dy < factor; dy++) {
        for (let dx = 0; dx < factor; dx++) {
          const i = ((y * factor + dy) * canvas.size + (x * factor + dx)) * 4;
          for (let c = 0; c < 4; c++) sums[c] += canvas.rgba[i + c];
        }
      }
      const o = (y * outSize + x) * 4;
      for (let c = 0; c < 4; c++) out[o + c] = Math.round(sums[c] / (factor * factor));
    }
  }
  return { size: outSize, rgba: out };
}

/**
 * Draw the BYZCARD mark. `inset` shrinks the design inside the square
 * (maskable icons need a safe zone); background always fills the square.
 */
function drawIcon(size, inset, roundedBackground) {
  const factor = 4;
  const s = size * factor;
  const canvas = makeCanvas(s);
  fillRoundedRect(canvas, 0, 0, s, s, roundedBackground ? s * 0.22 : 0, NAVY);

  const u = (s * (1 - inset * 2)) / 64; // design unit on the 64-unit grid
  const o = s * inset; // origin offset
  // Card outline: filled light rounded rect with navy inner fill.
  fillRoundedRect(canvas, o + 10 * u, o + 18 * u, 44 * u, 28 * u, 6 * u, LIGHT);
  fillRoundedRect(canvas, o + 13 * u, o + 21 * u, 38 * u, 22 * u, 4 * u, NAVY);
  // Portrait circle right, two text bars left.
  fillCircle(canvas, o + 42 * u, o + 32 * u, 5.5 * u, LIGHT);
  fillRoundedRect(canvas, o + 16 * u, o + 26 * u, 14 * u, 3 * u, 1.5 * u, MUTED);
  fillRoundedRect(canvas, o + 16 * u, o + 33 * u, 18 * u, 3 * u, 1.5 * u, LIGHT);

  const final = downsample(canvas, factor);
  return encodePng(final.size, final.rgba);
}

mkdirSync("public/icons", { recursive: true });
writeFileSync("public/icons/icon-192.png", drawIcon(192, 0, true));
writeFileSync("public/icons/icon-512.png", drawIcon(512, 0, true));
writeFileSync("public/icons/icon-maskable-512.png", drawIcon(512, 0.12, false));
writeFileSync("src/app/apple-icon.png", drawIcon(180, 0, false));
console.error("Icons written: public/icons/{192,512,maskable-512}, src/app/apple-icon.png");
