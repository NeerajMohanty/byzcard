import styles from "./landing.module.css";

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
  "Create account",
  "Create hosted profile",
  "Profile stored by the service",
  "Recipient loads the profile from the service",
] as const;

const BYZCARD_FLOW = [
  "Create card",
  "Stored on your device",
  "Show your QR",
  "Recipient opens the shared card",
] as const;

function Flow({ steps }: { steps: readonly string[] }) {
  return (
    <div>
      {steps.map((step, index) => (
        <div key={step}>
          {index > 0 && (
            <p className={styles.compareDown} aria-hidden="true">
              ↓
            </p>
          )}
          <p className={styles.compareStep} style={{ margin: 0 }}>
            {step}
          </p>
        </div>
      ))}
    </div>
  );
}

export function PrivacySection() {
  return (
    <section id="privacy" className={`${styles.section} ${styles.anchorTarget}`}>
      <div className={styles.container}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>Your card belongs to you.</h2>
          <p className={styles.lede}>
            BYZCARD doesn’t require an account and doesn’t keep a database of your business card.
            Your card and photo are stored locally on your device, and information is transmitted
            only when you intentionally use a sharing feature.
          </p>
        </div>
        <div className={styles.privacyPoints}>
          {POINTS.map((point) => (
            <div key={point.title} className={styles.featureCard}>
              <h3 className={styles.featureTitle}>{point.title}</h3>
              <p className={styles.featureCopy}>{point.copy}</p>
            </div>
          ))}
        </div>
        <div className={styles.compareGrid}>
          <div className={styles.comparePanel}>
            <h3 className={styles.compareTitle}>Typical hosted digital card</h3>
            <Flow steps={HOSTED_FLOW} />
          </div>
          <div className={`${styles.comparePanel} ${styles.comparePanelByz}`}>
            <h3 className={styles.compareTitle}>BYZCARD</h3>
            <Flow steps={BYZCARD_FLOW} />
          </div>
        </div>
      </div>
    </section>
  );
}
