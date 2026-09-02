import { ExampleCard } from "@/components/ExampleCard";
import { EXAMPLE_CARD } from "./exampleData";
import { initialsOf } from "@/core/card/types";
import styles from "./landing.module.css";

function Arrow() {
  return (
    <svg
      className={styles.demoArrow}
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
    >
      <path d="M12 4v14m0 0l-5-5m5 5l5-5" />
    </svg>
  );
}

/**
 * Static visual of the real flow: the owner's card with its QR, and a
 * faithful, fictional rendition of what the recipient sees after scanning.
 */
export function DemoSequence() {
  return (
    <figure className={styles.demo} style={{ margin: "48px 0 0" }}>
      <div className={styles.demoPhone}>
        <p className={styles.demoLabel}>You show your card</p>
        <ExampleCard />
      </div>
      <Arrow />
      <div className={styles.demoPhone}>
        <p className={styles.demoLabel}>They scan · it opens in their browser</p>
        <div className={styles.recipientMock}>
          <div className={styles.recipientTop}>
            <div
              aria-hidden="true"
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #1d2942 0%, #131b30 100%)",
                border: "2px solid rgba(255,255,255,0.14)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 600,
                fontSize: 15,
              }}
            >
              {initialsOf(EXAMPLE_CARD.fullName)}
            </div>
            <div>
              <p className={styles.recipientName}>{EXAMPLE_CARD.fullName}</p>
              <p className={styles.recipientMeta}>
                {EXAMPLE_CARD.role} · {EXAMPLE_CARD.company}
              </p>
            </div>
          </div>
          <p className={styles.recipientRow}>{EXAMPLE_CARD.phone}</p>
          <p className={styles.recipientRow}>{EXAMPLE_CARD.email}</p>
          <div className={styles.savePill} aria-hidden="true">
            Save contact
          </div>
        </div>
      </div>
      <figcaption className={styles.demoCaption}>
        They tap Save contact — your details go straight into their phone.
      </figcaption>
    </figure>
  );
}
