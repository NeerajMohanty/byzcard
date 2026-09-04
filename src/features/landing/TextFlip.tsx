"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { SPRING_SNAP } from "./motion";
import styles from "./landing.module.css";

interface TextFlipProps {
  words: readonly string[];
  intervalMs?: number;
  /** Extra class for the plate, so a section can pick its own surface. */
  plateClass?: string;
}

/**
 * Cycles one word while the container animates its width to match, so the
 * sentence around it never jumps. `words` must end on the resting word: that
 * is what renders on the server, what reduced-motion users keep, and what the
 * surrounding heading reports as its accessible name.
 */
export function TextFlip({ words, intervalMs = 2600, plateClass = "" }: TextFlipProps) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  // Off screen the cycle simply pauses: the interval is torn down and comes
  // back when the plate scrolls into view again.
  const inView = useInView(ref);
  const resting = words.length - 1;
  const [index, setIndex] = useState(resting);

  useEffect(() => {
    if (reduce === true || !inView) return;
    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % words.length);
    }, intervalMs);
    return () => {
      clearInterval(timer);
    };
  }, [reduce, inView, words.length, intervalMs]);

  if (reduce === true) {
    return <span className={`${styles.flipStatic} ${plateClass}`}>{words[resting]}</span>;
  }

  return (
    <motion.span
      ref={ref}
      layout
      className={`${styles.flipContainer} ${plateClass}`}
      transition={SPRING_SNAP}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={words[index]}
          layout="position"
          className={styles.flipWord}
          initial={{ opacity: 0, y: "-0.55em" }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: "0.55em" }}
          transition={SPRING_SNAP}
        >
          {words[index]}
        </motion.span>
      </AnimatePresence>
    </motion.span>
  );
}
