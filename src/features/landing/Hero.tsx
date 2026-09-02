import Link from "next/link";
import { ExampleCard } from "@/components/ExampleCard";
import styles from "./landing.module.css";

/** Hero: the product in five seconds, with the real card as the visual. */
export function Hero() {
  return (
    <header className={styles.hero}>
      <div className={`${styles.container} ${styles.heroGrid}`}>
        <div>
          <p className={styles.eyebrow}>BYZCARD</p>
          <h1 className={styles.heroTitle}>Your next introduction doesn’t need another app.</h1>
          <p className={styles.heroCopy}>
            Create your digital business card, keep it on your phone, and share it whenever you meet
            someone.
          </p>
          <p className={styles.heroFree}>No signup. No subscription. No account.</p>
          <div className={styles.heroActions}>
            <Link href="/create" className={`btn btn-primary ${styles.btnLarge}`}>
              Create my card
            </Link>
            <a href="#how-it-works" className={`btn ${styles.btnLarge}`}>
              See how it works
            </a>
          </div>
          <p className={styles.trustLine}>Stored on your device · Works offline · Open source</p>
        </div>
        <div className={styles.heroCard}>
          <ExampleCard />
        </div>
      </div>
    </header>
  );
}
