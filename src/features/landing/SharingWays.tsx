import styles from "./landing.module.css";

const WAYS = [
  {
    kicker: "QR code",
    title: "Show your QR",
    copy: "Open your card and let someone scan it with their phone camera. No BYZCARD app required.",
  },
  {
    kicker: "Home Screen",
    title: "Keep it one tap away",
    copy: "Add BYZCARD to your phone's Home Screen and open your card whenever you need it.",
  },
  {
    kicker: "Contacts",
    title: "Straight into Contacts",
    copy: "Recipients can save your details as a contact directly from their phone.",
  },
  {
    kicker: "Print",
    title: "Take it offline",
    copy: "Print a wallet-sized card or a 4 × 6 event badge directly from your browser.",
  },
  {
    kicker: "NFC tag",
    title: "Tap a physical tag",
    copy: "Write your BYZCARD link to compatible NFC tags from supported Android devices.",
  },
  {
    kicker: "Wallet",
    title: "Wallet, if you want it",
    copy: "Optional Apple and Google Wallet integrations are available when the deployment is configured for them.",
  },
] as const;

export function SharingWays() {
  return (
    <section id="share" className={`${styles.section} ${styles.sectionAlt} ${styles.anchorTarget}`}>
      <div className={styles.container}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>One card. Different ways to share it.</h2>
        </div>
        <div className={styles.featureGrid}>
          {WAYS.map((way) => (
            <div key={way.title} className={styles.featureCard}>
              <p className={styles.featureKicker}>{way.kicker}</p>
              <h3 className={styles.featureTitle}>{way.title}</h3>
              <p className={styles.featureCopy}>{way.copy}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
