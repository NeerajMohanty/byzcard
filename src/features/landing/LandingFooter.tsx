import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";
import styles from "./landing.module.css";

interface LandingFooterProps {
  github: string | null;
}

/**
 * The closing brand moment: one deep-ink card inset in the cream page, with a
 * single brand signature at display size and the footer navigation beneath it.
 */
export function LandingFooter({ github }: LandingFooterProps) {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerShell}>
        <div className={styles.footerCard}>
          {/* BrandMark inlines the canonical geometry of
              public/brand/byzcard-b-logo.svg; the icon is sized in em here so
              the lockup scales as one crisp, undistorted unit. */}
          <p className={styles.footerMark}>
            <BrandMark iconSize={64} />
          </p>
          <nav className={styles.footerLinks} aria-label="Footer">
            <Link href="/create">Create card</Link>
            <a href="#how-it-works">How it works</a>
            <a href="#share">Ways to share</a>
            <a href="#privacy">Privacy</a>
            <a href="#print">Print</a>
            {github !== null && (
              <a href={github} target="_blank" rel="noopener noreferrer">
                GitHub <span aria-hidden="true">↗</span>
              </a>
            )}
          </nav>
          <p className={styles.footerCopyright}>© {new Date().getFullYear()} Byzcard</p>
        </div>
      </div>
    </footer>
  );
}
