import Link from "next/link";
import styles from "./landing.module.css";
import { PrintMocks } from "./PrintMocks";

export function PrintSection() {
  return (
    <section id="print" className={`${styles.section} ${styles.anchorTarget}`}>
      <div className={`${styles.container} ${styles.printGrid}`}>
        <div>
          <div className={styles.sectionHead} style={{ marginBottom: 0 }}>
            <h2 className={styles.sectionTitle}>
              Digital when you want it.
              <br />
              Physical when you need it.
            </h2>
            <p className={styles.lede}>
              Print your BYZCARD directly from your browser. No print service. No upload required.
            </p>
          </div>
          <div className={styles.printFormats}>
            <div className={styles.featureCard}>
              <p className={styles.featureKicker}>Standard ID Card</p>
              <h3 className={styles.featureTitle}>CR80 · 3.375 × 2.125 in</h3>
              <p className={styles.featureCopy}>Wallet-sized.</p>
            </div>
            <div className={styles.featureCard}>
              <p className={styles.featureKicker}>Event Badge</p>
              <h3 className={styles.featureTitle}>4 × 6 in</h3>
              <p className={styles.featureCopy}>
                Designed for networking events, conferences and recruiting events.
              </p>
            </div>
          </div>
          <Link href="/create" className={`btn btn-primary ${styles.btnInline}`}>
            Create a card to print
          </Link>
        </div>
        <PrintMocks />
      </div>
    </section>
  );
}
