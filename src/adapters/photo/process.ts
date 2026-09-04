/**
 * On-device photo processing: validate → decode → resize → compress.
 * The stored photo keeps its aspect ratio so the user's crop/reposition
 * can reach every part of the original. Nothing is uploaded; output is a
 * Blob for IndexedDB.
 */
import type { PhotoMeta } from "@/core/card/types";

export const PHOTO_MAX_SOURCE_BYTES = 10 * 1024 * 1024;
export const PHOTO_ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
/** Longest stored edge — enough headroom for 2.5× zoom in the 4:5 frame. */
const STORAGE_MAX_EDGE = 800;
/** Apple Wallet thumbnail edge (90pt @3x). */
const WALLET_PNG_SIZE = 270;
const JPEG_QUALITY = 0.85;

export type PhotoError = "unsupported-type" | "too-large" | "decode-failed" | "process-failed";

export type PhotoResult =
  { ok: true; blob: Blob; meta: PhotoMeta } | { ok: false; error: PhotoError };

async function decodeImage(file: Blob): Promise<ImageBitmap | HTMLImageElement | null> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      return null;
    }
  }
  return await new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    image.src = url;
  });
}

function drawSquare(
  source: ImageBitmap | HTMLImageElement,
  edge: number,
): HTMLCanvasElement | null {
  const width = source.width;
  const height = source.height;
  if (width < 1 || height < 1) return null;
  const cropEdge = Math.min(width, height);
  const sx = Math.floor((width - cropEdge) / 2);
  const sy = Math.floor((height - cropEdge) / 2);
  const outEdge = Math.min(edge, cropEdge);
  const canvas = document.createElement("canvas");
  canvas.width = outEdge;
  canvas.height = outEdge;
  const context = canvas.getContext("2d");
  if (context === null) return null;
  context.drawImage(source, sx, sy, cropEdge, cropEdge, 0, 0, outEdge, outEdge);
  return canvas;
}

/** Aspect-preserving downscale (no crop): longest edge ≤ maxEdge. */
function drawScaled(
  source: ImageBitmap | HTMLImageElement,
  maxEdge: number,
): HTMLCanvasElement | null {
  const width = source.width;
  const height = source.height;
  if (width < 1 || height < 1) return null;
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const context = canvas.getContext("2d");
  if (context === null) return null;
  context.drawImage(source, 0, 0, width, height, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number,
): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/** Full local processing pipeline for a user-selected photo. */
export async function processPhoto(file: File): Promise<PhotoResult> {
  if (!(PHOTO_ACCEPTED_TYPES as readonly string[]).includes(file.type)) {
    return { ok: false, error: "unsupported-type" };
  }
  if (file.size > PHOTO_MAX_SOURCE_BYTES) return { ok: false, error: "too-large" };

  const source = await decodeImage(file);
  if (source === null) return { ok: false, error: "decode-failed" };
  const canvas = drawScaled(source, STORAGE_MAX_EDGE);
  if (source instanceof ImageBitmap) source.close();
  if (canvas === null) return { ok: false, error: "process-failed" };

  const blob = await canvasToBlob(canvas, "image/jpeg", JPEG_QUALITY);
  if (blob === null) return { ok: false, error: "process-failed" };
  return {
    ok: true,
    blob,
    meta: {
      mimeType: "image/jpeg",
      width: canvas.width,
      height: canvas.height,
      byteSize: blob.size,
    },
  };
}

/**
 * Re-encode the stored photo as PNG for Apple Wallet (pass images must be
 * PNG). Runs locally, only when the user requests a pass.
 */
export async function photoToWalletPng(stored: Blob): Promise<Blob | null> {
  const source = await decodeImage(stored);
  if (source === null) return null;
  const canvas = drawSquare(source, WALLET_PNG_SIZE);
  if (source instanceof ImageBitmap) source.close();
  if (canvas === null) return null;
  return canvasToBlob(canvas, "image/png");
}
