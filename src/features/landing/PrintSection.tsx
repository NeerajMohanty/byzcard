import Link from "next/link";
import styles from "./landing.module.css";
import { PrintMocks } from "./PrintMocks";

export function PrintSection() {
  return (
    <section id="print" className={`${styles.section} ${styles.anchorTarget}`}>
      <div className={`${styles.container} ${styles.printGrid}`}>
        <div>
          <div className={styles.sectionHead} style={{ marginBottom: 0 }}>
            <p className={styles.sectionEyebrow}>Print</p>
            <h2 className={styles.sectionTitle}>
              Digital when you want it.
              <br />
              Physical when you need it.
            </h2>
            <p className={styles.lede}>
              Print your BYZCARD directly from your browser. No print service. No upload required.
            </p>
          </div>
          <dl className={styles.specList}>
            <div className={styles.specRow}>
              <dt className={styles.specName}>Standard ID Card</dt>
              <dd className={styles.specDims}>CR80 · 3.375 × 2.125 in</dd>
              <dd className={styles.specNote}>Wallet-sized.</dd>
            </div>
            <div className={styles.specRow}>
              <dt className={styles.specName}>Event Badge</dt>
              <dd className={styles.specDims}>4 × 6 in</dd>
              <dd className={styles.specNote}>
                Designed for networking events, conferences and recruiting events.
              </dd>
            </div>
          </dl>
          <Link href="/create" className={`btn btn-primary ${styles.btnInline}`}>
            Create a card to print
          </Link>
        </div>
        <PrintMocks />
      </div>
    </section>
  );
}
