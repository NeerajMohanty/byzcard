import styles from "./landing.module.css";
import { CheckGlyph } from "./icons";

const POINTS = [
  { title: "No account", copy: "Start creating without signing up." },
  {
    title: "Local storage",
    copy: "Your card and photo are stored in your browser, on your device.",
  },
  {
    title: "No card database",
    copy: "BYZCARD doesn’t need a server-side profile database to show your card.",
  },
  {
    title: "You choose when to share",
    copy: "Information is transmitted only when you intentionally use a sharing feature.",
  },
] as const;

const HOSTED_FLOW = [
  "Create an account",
  "Create a hosted profile",
  "The service stores your profile",
  "Recipient loads it from the service",
] as const;

const BYZCARD_FLOW = [
  "Create your card",
  "Stored on your device",
  "Show your QR",
  "Recipient opens the shared card",
] as const;

function Lane({
  title,
  steps,
  highlighted,
}: {
  title: string;
  steps: readonly string[];
  highlighted: boolean;
}) {
  return (
    <div className={`${styles.lane} ${highlighted ? styles.laneByz : ""}`}>
      <p className={`${styles.laneHead} ${highlighted ? styles.laneHeadByz : ""}`}>{title}</p>
      <ol className={styles.laneList}>
        {steps.map((step) => (
          <li key={step} className={styles.laneItem}>
            {step}
          </li>
        ))}
      </ol>
    </div>
  );
}

export function PrivacySection() {
  return (
    <section id="privacy" className={`${styles.section} ${styles.anchorTarget}`}>
      <div className={styles.container}>
        <div className={styles.sectionHead}>
          <p className={styles.sectionEyebrow}>Privacy</p>
          <h2 className={styles.sectionTitle}>Your card belongs to you.</h2>
          <p className={styles.lede}>
            BYZCARD doesn’t require an account and doesn’t keep a database of your business card.
            Your card and photo are stored locally on your device, and information is transmitted
            only when you intentionally use a sharing feature.
          </p>
        </div>
        <div className={styles.pointsRow}>
          {POINTS.map((point) => (
            <div key={point.title}>
              <span className={styles.pointMark}>
                <CheckGlyph />
              </span>
              <h3 className={styles.itemTitle}>{point.title}</h3>
              <p className={styles.itemCopy}>{point.copy}</p>
            </div>
          ))}
        </div>
        <div className={styles.lanes}>
          <Lane title="Typical hosted digital card" steps={HOSTED_FLOW} highlighted={false} />
          <Lane title="BYZCARD" steps={BYZCARD_FLOW} highlighted />
        </div>
        <p className={styles.laneNote}>
          The difference: <span>with BYZCARD, there’s no service in the middle.</span>
        </p>
      </div>
    </section>
  );
}
