import styles from "./BrandMark.module.css";

interface BrandMarkProps {
  /** Icon square in px. The wordmark inherits the surrounding font style. */
  iconSize?: number;
}

/**
 * The Byzcard brand lockup: the B icon immediately before the wordmark,
 * reading to assistive technology as the single word "Byzcard". The icon
 * inlines the canonical geometry of public/brand/byzcard-b-logo.svg —
 * keep both in sync — so it stays crisp at any size with no extra request.
 */
export function BrandMark({ iconSize = 18 }: BrandMarkProps) {
  return (
    <span className={styles.lockup}>
      <svg
        className={styles.icon}
        viewBox="0 0 280 280"
        width={iconSize}
        height={iconSize}
        aria-hidden="true"
        focusable="false"
      >
        <rect x="2" y="2" width="276" height="276" rx="50" fill="#FFFFFF" />
        <path d="M55 26 H85 V205 H175 V130 H112 V100 H205 V235 H55 Z" fill="#000000" />
        <rect x="112" y="153" width="31" height="30" fill="#000000" />
      </svg>
      Byzcard
    </span>
  );
}
