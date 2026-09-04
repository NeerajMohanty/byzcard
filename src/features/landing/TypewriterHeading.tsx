"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { EASE_OUT } from "./motion";
import styles from "./landing.module.css";

interface TypewriterHeadingProps {
  /** Typed in order and joined by a space; the join is the finished heading. */
  segments: readonly string[];
  className?: string;
  /** Delay between characters. */
  speedMs?: number;
  /** Held at each segment boundary before the next word starts. */
  pauseMs?: number;
}

/** How long the cursor rests on the finished line before it fades. */
const CURSOR_HOLD_MS = 520;

/** Layout effect on the client only — React warns about it on the server. */
const useArmEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * Types a heading in one segment at a time, once, the first time it is seen.
 *
 * The heading is the sequence — it types its own words rather than cycling
 * anything — and it stops for good on the finished line. A screen reader gets
 * the complete heading from the first render and never hears the characters
 * arrive; a hidden copy of the final text holds the box open so nothing below
 * shifts while it types.
 */
export function TypewriterHeading({
  segments,
  className,
  speedMs = 80,
  pauseMs = 350,
}: TypewriterHeadingProps) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLHeadingElement>(null);
  // The bottom margin keeps the trigger honest: the page grows a little as it
  // settles, which can graze the heading past the fold for a frame, and a
  // latched trigger would then type the whole heading off screen.
  const inView = useInView(ref, { once: true, amount: 0.6, margin: "0px 0px -20% 0px" });

  const full = useMemo(() => segments.join(" "), [segments]);
  /** Character counts to hold at: the end of every segment but the last. */
  const stops = useMemo(() => {
    const set = new Set<number>();
    let at = 0;
    for (const segment of segments.slice(0, -1)) {
      at += segment.length;
      set.add(at);
      at += 1; // the space that follows
    }
    return set;
  }, [segments]);

  // null means "not typing", and renders the whole heading: that is what the
  // server sends, what a reduced-motion reader keeps, and what stays on screen
  // if the effects never run — the heading is never blank without JavaScript.
  const [typed, setTyped] = useState<number | null>(null);
  const [cursorGone, setCursorGone] = useState(false);

  // Emptied at hydration rather than when the section is reached, so the
  // finished heading is never painted and then wiped in front of the reader.
  // Only the timer waits for the section to be in view.
  useArmEffect(() => {
    if (reduce === true) return;
    setTyped((current) => current ?? 0);
  }, [reduce]);

  useEffect(() => {
    if (!inView || typed === null || typed >= full.length) return;
    // One timer per revealed character, cleared whenever this re-runs, so a
    // second StrictMode pass replaces the pending timer instead of adding one.
    const timer = window.setTimeout(
      () => {
        setTyped((current) => (current === null ? current : current + 1));
      },
      stops.has(typed) ? pauseMs : speedMs,
    );
    return () => {
      window.clearTimeout(timer);
    };
  }, [inView, typed, full.length, stops, speedMs, pauseMs]);

  // The cursor rests on the finished line for a beat, then fades for good.
  useEffect(() => {
    if (typed === null || typed < full.length) return;
    const timer = window.setTimeout(() => {
      setCursorGone(true);
    }, CURSOR_HOLD_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [typed, full.length]);

  // A reduced-motion reader keeps the whole heading even if the preference is
  // only detected after the first render.
  const showFull = reduce === true || typed === null;

  return (
    <h2 className={className} ref={ref}>
      <span className="visually-hidden">{full}</span>
      <span aria-hidden="true" className={styles.typeLine}>
        <span className={styles.typeGhost}>{full}</span>
        <span>
          {showFull ? full : full.slice(0, typed)}
          <AnimatePresence>
            {!showFull && inView && !cursorGone && (
              <motion.span
                key="cursor"
                className={styles.typeCursor}
                exit={{ opacity: 0 }}
                transition={EASE_OUT}
              >
                <span className={styles.typeCaret}>|</span>
              </motion.span>
            )}
          </AnimatePresence>
        </span>
      </span>
    </h2>
  );
}
