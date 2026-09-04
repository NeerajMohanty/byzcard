import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";
import { ExampleCard } from "@/components/ExampleCard";
import { TextFlip } from "./TextFlip";
import { TiltSurface } from "./TiltSurface";
import type { QrSymbol } from "@/core/qr";
import styles from "./landing.module.css";

/**
 * The rotating close of the headline. The list ends on the resting word, which
 * is what the server renders, what reduced-motion users keep, and what the
 * heading reports as its accessible name.
 */
const HERO_WORDS = ["account.", "subscription.", "login.", "app."] as const;

/** Hero: the product in five seconds, with the real card as the visual. */
export function Hero({ qr }: { qr: QrSymbol }) {
  return (
    <header className={styles.hero}>
      <div className={`${styles.container} ${styles.heroGrid}`}>
        <div>
          <p className={styles.eyebrow}>
            <BrandMark iconSize={20} />
          </p>
          <h1
            className={styles.heroTitle}
            aria-label="Your next introduction doesn’t need another app."
          >
            {/* Two inline segments separated by a real space: they wrap onto
                separate lines when they cannot share one, so no break element
                is needed and the words can never run together. The second
                segment keeps the phrase and the rotating word in one baseline
                row, so the animated word stays attached to its sentence.
                The fixed phrase is plain static text — it is fully present
                from the first paint, and only the closing word animates. */}
            <span aria-hidden="true">
              <span className={styles.heroPhrase}>
                <span>Your next introduction</span>
              </span>{" "}
              <span className={styles.heroPhrase}>
                <span>doesn’t need another</span>{" "}
                <TextFlip words={HERO_WORDS} intervalMs={2900} plateClass={styles.flipPlateLight} />
              </span>
            </span>
          </h1>
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
          <div className={styles.heroStage}>
            <TiltSurface className={styles.inkGlass} glare>
              <ExampleCard qr={qr} />
              <span aria-hidden="true" className={styles.inkGlassSheen} />
            </TiltSurface>
          </div>
        </div>
      </div>
    </header>
  );
}
