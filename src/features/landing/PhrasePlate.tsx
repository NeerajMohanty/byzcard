"use client";

import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { SPRING_SOFT } from "./motion";
import styles from "./landing.module.css";

/**
 * A phrase that arrives once, when its section scrolls in: the plate wipes
 * open from the left while the words rise through a blur behind it. It runs
 * a single time and then holds — the wording never changes.
 *
 * The words stay ordinary text nodes with ordinary spaces, so the heading's
 * accessible name is exactly the sentence it reads.
 */
export function PhrasePlate({ text }: { text: string }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { amount: 0.5, once: true });
  const words = text.split(" ");

  if (reduce === true) {
    return <span className={styles.phrasePlate}>{text}</span>;
  }

  return (
    <motion.span
      ref={ref}
      className={styles.phrasePlate}
      initial={{ clipPath: "inset(0 100% 0 0 round 0.18em)" }}
      animate={inView ? { clipPath: "inset(0 0% 0 0 round 0.18em)" } : undefined}
      transition={{ duration: 0.62, ease: [0.22, 1, 0.36, 1] }}
    >
      {words.map((word, index) => (
        <span key={`${word}-${String(index)}`}>
          <motion.span
            className={styles.phraseWord}
            initial={{ opacity: 0, y: "0.5em", filter: "blur(6px)" }}
            animate={inView ? { opacity: 1, y: 0, filter: "blur(0px)" } : undefined}
            transition={{ ...SPRING_SOFT, delay: 0.14 + index * 0.05 }}
          >
            {word}
          </motion.span>
          {index < words.length - 1 ? " " : ""}
        </span>
      ))}
    </motion.span>
  );
}
