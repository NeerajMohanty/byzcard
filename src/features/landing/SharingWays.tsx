import styles from "./landing.module.css";
import { PhrasePlate } from "./PhrasePlate";
import { ShareStack } from "./ShareStack";

export function SharingWays() {
  return (
    <section id="share" className={`${styles.section} ${styles.sectionAlt} ${styles.anchorTarget}`}>
      <div className={styles.container}>
        <div className={`${styles.sectionHead} ${styles.sectionHeadWide}`}>
          <p className={styles.sectionEyebrow}>Ways to share</p>
          <h2 className={`${styles.sectionTitle} ${styles.titleOneLine}`}>
            One card. <PhrasePlate text="Different ways to share it." />
          </h2>
        </div>
        <ShareStack />
      </div>
    </section>
  );
}
