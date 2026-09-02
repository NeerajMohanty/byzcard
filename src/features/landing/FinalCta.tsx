import Link from "next/link";
import styles from "./landing.module.css";

/** Short editorial note plus the closing call to action. */
export function FinalCta() {
  return (
    <>
      <section className={styles.section}>
        <div className={`${styles.container} ${styles.editorial}`}>
          <h2 className={styles.sectionTitle}>
            Why create an account just to share your phone number?
          </h2>
          <p className={styles.lede}>
            BYZCARD was designed around a simpler idea: create your card, keep it on your device,
            and share it when you need it.
          </p>
        </div>
      </section>
      <section className={styles.finalCta}>
        <div className={styles.container}>
          <h2 className={styles.sectionTitle} style={{ marginBottom: 26 }}>
            Create your BYZCARD in a minute.
          </h2>
          <Link
            href="/create"
            className={`btn btn-primary ${styles.btnLarge} ${styles.ctaCompact}`}
          >
            Create my card
          </Link>
          <p className={styles.finalNote}>No signup. No credit card. No subscription.</p>
        </div>
      </section>
    </>
  );
}
