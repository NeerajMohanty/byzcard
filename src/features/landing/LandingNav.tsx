import Link from "next/link";
import styles from "./landing.module.css";

interface LandingNavProps {
  github: string | null;
}

/**
 * Lightweight responsive navigation. Section links appear on wider
 * viewports; on phones the wordmark and primary CTA stay reachable and
 * the sections follow naturally on scroll.
 */
export function LandingNav({ github }: LandingNavProps) {
  return (
    <nav className={styles.nav} aria-label="Main">
      <div className={`${styles.container} ${styles.navInner}`}>
        <Link href="/" className={styles.wordmark}>
          BYZCARD
        </Link>
        <div className={styles.navLinks}>
          <a href="#how-it-works">How it works</a>
          <a href="#share">Ways to share</a>
          <a href="#privacy">Privacy</a>
          <a href="#print">Print</a>
        </div>
        <div className={styles.navActions}>
          {github !== null && (
            <div className={styles.navLinks}>
              <a href={github} target="_blank" rel="noopener noreferrer">
                GitHub
              </a>
            </div>
          )}
          <Link href="/create" className={`btn btn-primary ${styles.btnInline}`}>
            Create my card
          </Link>
        </div>
      </div>
    </nav>
  );
}
