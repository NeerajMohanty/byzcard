import { DEFAULT_PHOTO_CROP, type PhotoCrop } from "@/core/card/types";

/** The portrait photo frame's aspect ratio (width / height). */
export const FRAME_ASPECT = 4 / 5;

export interface CropLayout {
  /** Displayed image size as fractions of the frame (≥ 1 per axis). */
  w: number;
  h: number;
  /** CSS offsets as fractions of the frame (≤ 0). */
  left: number;
  top: number;
}

/**
 * Cover layout for an image of aspect `imageAspect` inside the 4:5 frame,
 * panned/zoomed by `crop`. At zoom 1 the image exactly covers the frame;
 * x/y ∈ [-1, 1] span exactly the available overflow on each axis, so every
 * stored crop is valid at every zoom for every image orientation — empty
 * space inside the frame is impossible by construction.
 */
export function cropLayout(
  imageAspect: number | undefined,
  crop: PhotoCrop | undefined,
): CropLayout {
  const ai =
    imageAspect !== undefined && Number.isFinite(imageAspect) && imageAspect > 0 ? imageAspect : 1;
  const { x, y, zoom } = crop ?? DEFAULT_PHOTO_CROP;
  const w = Math.max(1, ai / FRAME_ASPECT) * zoom;
  const h = Math.max(1, FRAME_ASPECT / ai) * zoom;
  return {
    w,
    h,
    left: (1 - w) / 2 + (x * (w - 1)) / 2,
    top: (1 - h) / 2 + (y * (h - 1)) / 2,
  };
}
