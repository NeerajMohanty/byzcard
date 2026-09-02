import styles from "./landing.module.css";

const POINTS = ["Transparent", "No lock-in", "Self-hostable", "Community-friendly"] as const;

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
          <h2 className={styles.sectionTitle}>Open by design.</h2>
          <p className={styles.lede}>
            BYZCARD is being built as an open-source project. Inspect it. Self-host it. Improve it.
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
              View on GitHub
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
