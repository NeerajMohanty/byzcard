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
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>Open by design.</h2>
          <p className={styles.lede}>
            BYZCARD is being built as an open-source project. Inspect it. Self-host it. Improve it.
            Make it your own.
          </p>
        </div>
        <ul className={styles.trustStrip} style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {POINTS.map((point) => (
            <li key={point} className={styles.trustCell}>
              {point}
            </li>
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
