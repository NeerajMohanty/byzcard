"use client";

import { useEffect, useRef } from "react";
import { clampPhotoCrop, DEFAULT_PHOTO_CROP, type PhotoCrop } from "@/core/card/types";
import { cropLayout } from "@/lib/cropLayout";
import { Avatar } from "@/components/Avatar";

interface PhotoAdjustProps {
  fullName: string;
  photoUrl: string;
  aspect: number;
  crop: PhotoCrop;
  onCropChange: (crop: PhotoCrop) => void;
  onClose: () => void;
}

/** Stage width in px (4:5 frame; height derives from it). Fits a 320px
    viewport: 320 − 2×16 overlay padding − 2×14 panel padding = 260. */
const STAGE_WIDTH = 260;
const ZOOM_STEP = 0.15;

interface PointerState {
  pointers: Map<number, { x: number; y: number }>;
  lastDistance: number | null;
}

/**
 * Focused photo-framing editor: drag anywhere on the portrait to
 * reposition, pinch (or the +/− buttons) to zoom. Changes apply live;
 * bounds are self-clamping, so the frame can never show empty space.
 */
export function PhotoAdjust({
  fullName,
  photoUrl,
  aspect,
  crop,
  onCropChange,
  onClose,
}: PhotoAdjustProps) {
  const doneRef = useRef<HTMLButtonElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const state = useRef<PointerState>({ pointers: new Map(), lastDistance: null });

  useEffect(() => {
    doneRef.current?.focus();
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Handlers are re-created each render, so they always close over the
  // latest crop (pointer events flush a render between moves).
  const applyZoom = (factor: number): void => {
    onCropChange(clampPhotoCrop({ ...crop, zoom: crop.zoom * factor }));
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>): void => {
    state.current.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    state.current.lastDistance = null;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture is an enhancement; jsdom and old engines lack it.
    }
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>): void => {
    const { pointers } = state.current;
    const previous = pointers.get(event.pointerId);
    if (previous === undefined) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointers.size === 2) {
      // Pinch: zoom by the ratio of successive two-pointer distances.
      const [a, b] = [...pointers.values()];
      if (a === undefined || b === undefined) return;
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (state.current.lastDistance !== null && state.current.lastDistance > 0) {
        applyZoom(distance / state.current.lastDistance);
      }
      state.current.lastDistance = distance;
      return;
    }

    // One-finger / mouse drag: translate the available overflow directly.
    const stageWidth = stageRef.current?.getBoundingClientRect().width ?? STAGE_WIDTH;
    const width = stageWidth > 0 ? stageWidth : STAGE_WIDTH;
    const height = width * 1.25;
    const layout = cropLayout(aspect, crop);
    const panX = ((layout.w - 1) * width) / 2;
    const panY = ((layout.h - 1) * height) / 2;
    const dx = event.clientX - previous.x;
    const dy = event.clientY - previous.y;
    onCropChange(
      clampPhotoCrop({
        x: panX > 0 ? crop.x + dx / panX : crop.x,
        y: panY > 0 ? crop.y + dy / panY : crop.y,
        zoom: crop.zoom,
      }),
    );
  };

  const handlePointerEnd = (event: React.PointerEvent<HTMLDivElement>): void => {
    state.current.pointers.delete(event.pointerId);
    state.current.lastDistance = null;
  };

  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(3, 5, 10, 0.78)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 60,
        padding: 16,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Adjust photo"
        onClick={(event) => event.stopPropagation()}
        style={{
          background: "var(--surface)",
          border: "1px solid var(--card-edge)",
          borderRadius: 16,
          padding: 14,
          width: "100%",
          maxWidth: 320,
        }}
      >
        <h3 style={{ margin: "0 0 6px", fontSize: 17 }}>Adjust photo</h3>
        <p className="note" style={{ margin: "0 0 14px" }}>
          Drag to reposition. Pinch or use the buttons to zoom.
        </p>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <div
            ref={stageRef}
            data-testid="photo-adjust-stage"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
            onPointerCancel={handlePointerEnd}
            style={{
              touchAction: "none",
              cursor: "grab",
              width: STAGE_WIDTH,
              userSelect: "none",
              position: "relative",
              overflow: "hidden",
              borderRadius: Math.round(STAGE_WIDTH * 0.125),
            }}
          >
            <Avatar
              fullName={fullName}
              photoUrl={photoUrl}
              size={STAGE_WIDTH}
              crop={crop}
              aspect={aspect}
            />
            {/* The card shows the circle inscribed in this 4:5 window (full
                width, vertically centred); the shade marks what stays outside. */}
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                left: 0,
                top: "10%",
                width: "100%",
                aspectRatio: "1 / 1",
                borderRadius: "50%",
                border: "1px solid rgba(255, 255, 255, 0.75)",
                boxShadow: "0 0 0 999px rgba(0, 0, 0, 0.42)",
                pointerEvents: "none",
              }}
            />
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 10, margin: "14px 0" }}>
          <button
            type="button"
            className="btn"
            aria-label="Zoom out"
            style={{ width: 56, minHeight: 44 }}
            onClick={() => applyZoom(1 / (1 + ZOOM_STEP))}
          >
            −
          </button>
          <button
            type="button"
            className="btn"
            aria-label="Zoom in"
            style={{ width: 56, minHeight: 44 }}
            onClick={() => applyZoom(1 + ZOOM_STEP)}
          >
            +
          </button>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            className="btn"
            style={{ flex: 1 }}
            onClick={() => onCropChange(DEFAULT_PHOTO_CROP)}
          >
            Reset
          </button>
          <button
            ref={doneRef}
            type="button"
            className="btn btn-primary"
            style={{ flex: 1 }}
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
