import styles from "./landing.module.css";
import { ContactGlyph, HomeGlyph, NfcGlyph, PrintGlyph, QrGlyph, WalletGlyph } from "./icons";

const WAYS = [
  {
    glyph: <QrGlyph />,
    title: "Show your QR",
    copy: "Open your card and let someone scan it with their phone camera. No BYZCARD app required.",
  },
  {
    glyph: <HomeGlyph />,
    title: "Keep it one tap away",
    copy: "Add BYZCARD to your phone's Home Screen and open your card whenever you need it.",
  },
  {
    glyph: <ContactGlyph />,
    title: "Straight into Contacts",
    copy: "Recipients can save your details as a contact directly from their phone.",
  },
  {
    glyph: <PrintGlyph />,
    title: "Take it offline",
    copy: "Print a wallet-sized card or a 4 × 6 event badge directly from your browser.",
  },
  {
    glyph: <NfcGlyph />,
    title: "Tap a physical tag",
    copy: "Write your BYZCARD link to compatible NFC tags from supported Android devices.",
  },
  {
    glyph: <WalletGlyph />,
    title: "Wallet, if you want it",
    copy: "Optional Apple and Google Wallet integrations are available when the deployment is configured for them.",
  },
] as const;

export function SharingWays() {
  return (
    <section id="share" className={`${styles.section} ${styles.sectionAlt} ${styles.anchorTarget}`}>
      <div className={styles.container}>
        <div className={styles.sectionHead}>
          <p className={styles.sectionEyebrow}>Ways to share</p>
          <h2 className={styles.sectionTitle}>One card. Different ways to share it.</h2>
        </div>
        <div className={styles.shareList}>
          {WAYS.map((way) => (
            <div key={way.title} className={styles.shareRow}>
              <div className={styles.shareGlyph}>{way.glyph}</div>
              <div>
                <h3 className={styles.itemTitle}>{way.title}</h3>
                <p className={styles.itemCopy}>{way.copy}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
