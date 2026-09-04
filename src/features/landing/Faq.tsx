"use client";

import { useId, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { EASE_OUT, withMotion } from "./motion";
import styles from "./landing.module.css";

/**
 * Common questions, answered from what the product actually does today.
 * A button/region accordion: `aria-expanded` reports state, `aria-controls`
 * ties the pair together, and Enter/Space work because these are buttons.
 * One panel open at a time.
 */
const QUESTIONS = [
  {
    q: "Do I need an account?",
    a: "No. You can create your card and use it without signing up — there is no account to make and nothing to subscribe to.",
  },
  {
    q: "Where is my card stored?",
    a: "Your card and photo are stored locally in your browser, on your device. Byzcard doesn’t keep a server-side database of your card.",
  },
  {
    q: "Does the person scanning my QR need Byzcard?",
    a: "No. Your shared card opens in their browser, and they can save your details straight into their contacts. They don’t install anything.",
  },
  {
    q: "Does Byzcard work offline?",
    a: "Once Byzcard has been loaded, a service worker caches the app so your card and its QR stay reachable without a connection. Installing it first isn’t required.",
  },
  {
    q: "Can I keep Byzcard on my Home Screen?",
    a: "Yes. Supported browsers let you add Byzcard to your Home Screen, and it opens straight to your card. The exact steps differ between browsers.",
  },
  {
    q: "Can I print my card?",
    a: "Yes. Byzcard prints a CR80 wallet-sized card and a 4 × 6 in event badge directly from your browser — no print service and no upload.",
  },
  {
    q: "Can I self-host Byzcard?",
    a: "Yes. Byzcard is being built as an open-source project, so you can run your own deployment and make it your own.",
  },
  {
    q: "Do Wallet and NFC work everywhere?",
    a: "No. Apple and Google Wallet depend on how the deployment is configured, and writing NFC tags depends on browser and device support. Sharing by QR always works.",
  },
] as const;

export function Faq() {
  const reduce = useReducedMotion();
  const baseId = useId();
  const [open, setOpen] = useState<number | null>(null);
  const transition = withMotion(reduce, EASE_OUT);

  return (
    <section id="faq" className={`${styles.section} ${styles.anchorTarget}`}>
      <div className={`${styles.container} ${styles.faqGrid}`}>
        <div className={styles.sectionHead} style={{ marginBottom: 0 }}>
          <p className={styles.sectionEyebrow}>Common questions</p>
          <h2 className={styles.sectionTitle}>Frequently asked.</h2>
          <p className={styles.lede}>Quick answers about how Byzcard works.</p>
        </div>
        <div className={styles.faqPanel}>
          {QUESTIONS.map((item, index) => {
            const isOpen = open === index;
            const buttonId = `${baseId}-q${String(index)}`;
            const panelId = `${baseId}-a${String(index)}`;
            return (
              <div key={item.q} className={styles.faqItem}>
                <button
                  type="button"
                  id={buttonId}
                  className={styles.faqSummary}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => {
                    setOpen(isOpen ? null : index);
                  }}
                >
                  <span className={styles.faqQuestion}>{item.q}</span>
                  <span
                    className={`${styles.faqIcon} ${isOpen ? styles.faqIconOpen : ""}`}
                    aria-hidden="true"
                  />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key="panel"
                      id={panelId}
                      role="region"
                      aria-labelledby={buttonId}
                      className={styles.faqPanelBody}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={transition}
                    >
                      <p className={styles.faqAnswer}>{item.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
