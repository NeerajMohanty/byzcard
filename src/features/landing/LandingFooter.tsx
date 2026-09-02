import Link from "next/link";
import styles from "./landing.module.css";

interface LandingFooterProps {
  github: string | null;
}

export function LandingFooter({ github }: LandingFooterProps) {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.footerGrid}>
          <div>
            <p className={styles.wordmark} style={{ margin: 0 }}>
              BYZCARD
            </p>
            <p className={styles.footerTag}>Your business card. On your phone.</p>
          </div>
          <div className={styles.footerLinks}>
            <Link href="/create">Create card</Link>
            <a href="#how-it-works">How it works</a>
            <a href="#privacy">Privacy</a>
            <a href="#print">Print</a>
            {github !== null && (
              <a href={github} target="_blank" rel="noopener noreferrer">
                GitHub
              </a>
            )}
          </div>
        </div>
        <p className={styles.footerCopyright}>© {new Date().getFullYear()} BYZCARD</p>
      </div>
    </footer>
  );
}
