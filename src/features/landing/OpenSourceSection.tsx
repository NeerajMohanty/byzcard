import styles from "./landing.module.css";
import { TextFlip } from "./TextFlip";

const POINTS = ["Transparent", "No lock-in", "Self-hostable", "Community-friendly"] as const;

/** Ends on the resting word: that is what SSR, reduced motion and the
    heading's accessible name all use. */
const FLIP_WORDS = ["inspect", "self-host", "improve", "own"] as const;

interface OpenSourceSectionProps {
  github: string | null;
}

export function OpenSourceSection({ github }: OpenSourceSectionProps) {
  return (
    <section
      id="open-source"
      className={`${styles.section} ${styles.sectionAlt} ${styles.anchorTarget}`}
    >
      <div className={styles.container}>
        <div className={styles.sectionHead} style={{ marginBottom: 24 }}>
          <p className={styles.sectionEyebrow}>Open source</p>
          <h2 className={styles.sectionTitle} aria-label="Open source. Yours to own.">
            <span aria-hidden="true">
              Open source. Yours to <TextFlip words={FLIP_WORDS} />.
            </span>
          </h2>
          <p className={styles.lede}>
            Byzcard is being built as an open-source project. Inspect it. Self-host it. Improve it.
            Make it your own.
          </p>
        </div>
        <ul className={styles.inlineList}>
          {POINTS.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
        {github !== null && (
          <div style={{ marginTop: 28 }}>
            <a
              href={github}
              target="_blank"
              rel="noopener noreferrer"
              className={`btn ${styles.btnInline}`}
            >
              View on GitHub <span aria-hidden="true">↗</span>
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
