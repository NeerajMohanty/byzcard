import styles from "./landing.module.css";
import { CheckGlyph, ContactGlyph, HomeGlyph, QrGlyph } from "./icons";

const POINTS = [
  { label: "No account", glyph: <ContactGlyph /> },
  { label: "Stored on your device", glyph: <HomeGlyph /> },
  { label: "Works offline", glyph: <QrGlyph /> },
  { label: "Open source", glyph: <CheckGlyph /> },
] as const;

/** Light borderless value strip under the hero — no boxes, no fake proof. */
export function TrustStrip() {
  return (
    <section aria-label="Product principles">
      <div className={styles.container}>
        <ul className={styles.plainStrip}>
          {POINTS.map((point) => (
            <li key={point.label} className={styles.plainItem}>
              {point.glyph}
              {point.label}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
