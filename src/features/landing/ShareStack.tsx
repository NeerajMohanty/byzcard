"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion, type MotionValue } from "motion/react";
import { ContactGlyph, HomeGlyph, NfcGlyph, PrintGlyph, QrGlyph, WalletGlyph } from "./icons";
import styles from "./landing.module.css";

/** The six sharing methods — wording unchanged from the original rows. */
const WAYS = [
  {
    glyph: <QrGlyph />,
    title: "Show your QR",
    copy: "Open your card and let someone scan it with their phone camera. No Byzcard app required.",
  },
  {
    glyph: <HomeGlyph />,
    title: "Keep it one tap away",
    copy: "Add Byzcard to your phone's Home Screen and open your card whenever you need it.",
  },
  {
    glyph: <ContactGlyph />,
    title: "Straight into Contacts",
    copy: "Recipients can save your details as a contact directly from their phone.",
  },
  {
    glyph: <PrintGlyph />,
    title: "Take it offline",
    copy: "Print a wallet-sized card or a 4 × 6 event badge directly from your browser.",
  },
  {
    glyph: <NfcGlyph />,
    title: "Tap a physical tag",
    copy: "Write your Byzcard link to compatible NFC tags from supported Android devices.",
  },
  {
    glyph: <WalletGlyph />,
    title: "Wallet, if you want it",
    copy: "Optional Apple and Google Wallet integrations are available when the deployment is configured for them.",
  },
] as const;

/** Six method cards plus the closing summary. */
const TOTAL = WAYS.length + 1;
/** Vertical step between parked layers, in px. */
const STEP = 13;

function pad(value: number): string {
  return value.toString().padStart(2, "0");
}

interface StackCardProps {
  index: number;
  scrollProgress: MotionValue<number>;
  animate: boolean;
  children: React.ReactNode;
}

/**
 * One sticky layer of the deck.
 *
 * Every card sticks a few pixels lower than the one before it, so each earlier
 * card keeps a visible top edge as the deck accumulates. Scale is driven by
 * how many cards have landed on top, scaled from the top edge so that edge
 * stays put. Nothing here touches page scrolling — the cards are plain sticky
 * elements reacting to the document's own scroll position.
 */
function StackCard({ index, scrollProgress, animate, children }: StackCardProps) {
  const buried = useTransform(scrollProgress, (p) =>
    Math.min(3, Math.max(0, p * (TOTAL - 1) - index)),
  );
  const scale = useTransform(buried, [0, 3], [1, 0.945]);

  return (
    <motion.article
      className={styles.shareCard}
      style={{
        top: `calc(var(--share-stack-top) + ${String(index * STEP)}px)`,
        ...(animate ? { scale } : {}),
      }}
    >
      {children}
    </motion.article>
  );
}

export function ShareStack() {
  const reduce = useReducedMotion();
  const stackRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: stackRef,
    offset: ["start start", "end end"],
  });
  const animate = reduce !== true;

  return (
    <div className={styles.shareStack} ref={stackRef}>
      {WAYS.map((way, index) => (
        <StackCard key={way.title} index={index} scrollProgress={scrollYProgress} animate={animate}>
          <div className={styles.shareCardAside}>
            <span className={styles.shareCardGlyph} aria-hidden="true">
              {way.glyph}
            </span>
            <span className={styles.shareCardBig} aria-hidden="true">
              {pad(index + 1)}
            </span>
          </div>
          <div className={styles.shareCardBody}>
            <h3 className={styles.shareCardTitle}>{way.title}</h3>
            <p className={styles.shareCardCopy}>{way.copy}</p>
          </div>
        </StackCard>
      ))}

      <StackCard index={WAYS.length} scrollProgress={scrollYProgress} animate={animate}>
        <div className={styles.shareSummary}>
          <h3 className={styles.shareCardTitle}>One card. Six ways to share.</h3>
          <ul className={styles.shareSummaryGrid}>
            {WAYS.map((way) => (
              <li key={way.title} className={styles.shareSummaryItem}>
                <span className={styles.shareSummaryGlyph} aria-hidden="true">
                  {way.glyph}
                </span>
                <div>
                  <h4 className={styles.shareSummaryTitle}>{way.title}</h4>
                  <p className={styles.shareSummaryCopy}>{way.copy}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </StackCard>
    </div>
  );
}
