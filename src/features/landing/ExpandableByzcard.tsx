"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { ExampleCard } from "@/components/ExampleCard";
import type { QrSymbol } from "@/core/qr";
import { EASE_OUT, withMotion } from "./motion";
import styles from "./landing.module.css";

/**
 * The width the preview's card is laid out at before scaling — the same
 * width the reel stage gives every state, so the miniature is a faithful
 * reduction of the card the expanded view shows.
 */
const PREVIEW_LAYOUT_WIDTH = 340;
/** How much the laid-out card is reduced to sit in the reel's footprint. */
const PREVIEW_SCALE = 0.52;

interface ByzcardPreviewFaceProps {
  qr: QrSymbol;
  onExpand: () => void;
  /** The reel returns focus here after the expanded card closes. */
  buttonRef: React.RefObject<HTMLButtonElement | null>;
}

/**
 * Reel state 1 — the owner's Byzcard as a compact, tappable miniature.
 * The real card is laid out at full reel width behind a scale transform;
 * the button holds exactly the scaled footprint, so the reel measures a
 * state the size of its neighbours instead of the full-height card.
 */
export function ByzcardPreviewFace({ qr, onExpand, buttonRef }: ByzcardPreviewFaceProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | null>(null);

  // The card's natural height at the fixed layout width decides the
  // footprint; fonts settling can nudge it, so keep observing.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) return;
    const read = (): void => {
      setHeight(canvas.offsetHeight);
    };
    const observer = new ResizeObserver(read);
    observer.observe(canvas);
    read();
    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <button
      ref={buttonRef}
      type="button"
      className={styles.previewButton}
      aria-haspopup="dialog"
      aria-label="View your Byzcard at full size"
      onClick={onExpand}
      style={{
        width: PREVIEW_LAYOUT_WIDTH * PREVIEW_SCALE,
        ...(height === null ? {} : { height: Math.round(height * PREVIEW_SCALE) }),
      }}
    >
      <div
        ref={canvasRef}
        className={styles.previewCanvas}
        style={{
          width: PREVIEW_LAYOUT_WIDTH,
          marginLeft: -PREVIEW_LAYOUT_WIDTH / 2,
          transform: `scale(${PREVIEW_SCALE})`,
        }}
      >
        <div className={styles.reelFace}>
          <ExampleCard qr={qr} />
        </div>
      </div>
      <span className={styles.previewHint} aria-hidden="true">
        View full card
      </span>
    </button>
  );
}

interface ByzcardExpandedProps {
  qr: QrSymbol;
  onClose: () => void;
  reduce: boolean | null;
}

/**
 * The expanded state: the complete canonical Byzcard — dark profile and
 * Quick Access — centred over a dimmed backdrop, scrollable when the
 * viewport is shorter than the card. Closes on the X, the backdrop,
 * or Escape. Rendered inside the landing page tree so the `--ink-*`
 * material tokens still reach the card.
 */
export function ByzcardExpanded({ qr, onClose, reduce }: ByzcardExpandedProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") onClose();
      // The example card renders no links, so the close button is the only
      // focusable control — keep Tab from drifting to the page behind.
      if (event.key === "Tab") {
        event.preventDefault();
        closeRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  const fade = withMotion(reduce, EASE_OUT);

  return (
    <motion.div
      className={styles.expandBackdrop}
      role="presentation"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={fade}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Your Byzcard, full size"
        className={styles.expandDialog}
        onClick={(event) => {
          event.stopPropagation();
        }}
        initial={{ opacity: 0, scale: 0.94, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 6 }}
        transition={fade}
      >
        <div className={styles.expandBar}>
          <button
            ref={closeRef}
            type="button"
            className={styles.expandClose}
            aria-label="Close full card view"
            onClick={onClose}
          >
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
        <div className={styles.expandScroll}>
          <div className={styles.reelFace}>
            <ExampleCard qr={qr} />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
