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
          <h2 className={styles.sectionTitle}>Your next introduction doesn’t need another app.</h2>
          <p className={styles.lede} style={{ margin: "0 0 26px" }}>
            Create your BYZCARD in a minute.
          </p>
          <Link href="/create" className={`btn btn-primary ${styles.btnLarge}`}>
            Create my card
          </Link>
          <p className={styles.finalNote}>No signup. No credit card. No account.</p>
        </div>
      </section>
    </>
  );
}
