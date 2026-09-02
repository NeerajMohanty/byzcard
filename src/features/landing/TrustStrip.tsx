import styles from "./landing.module.css";

const POINTS = ["No account", "Stored on your device", "Works offline", "Open source"] as const;

/** Compact value strip under the hero — real properties, no fake proof. */
export function TrustStrip() {
  return (
    <section aria-label="Product principles">
      <div className={styles.container}>
        <ul className={styles.trustStrip} style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {POINTS.map((point) => (
            <li key={point} className={styles.trustCell}>
              {point}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
