/**
 * Faithful miniature renditions of the two real print formats, using the
 * fictional example data and a genuinely generated QR — no screenshots,
 * no fake assets. The QR symbol is precomputed on the server and passed in.
 */
import { EXAMPLE_CARD } from "./exampleData";
import { BrandMark } from "@/components/BrandMark";
import { QrSvg } from "@/components/QrSvg";
import { displayName, initialsOf } from "@/core/card/types";
import type { QrSymbol } from "@/core/qr";
import styles from "./landing.module.css";

function MockAvatar({ size }: { size: number }) {
  return (
    <div
      aria-hidden="true"
      style={{
        width: size,
        height: Math.round(size * 1.25),
        borderRadius: Math.max(6, Math.round(size * 0.125)),
        background: "linear-gradient(135deg, #1d2942 0%, #131b30 100%)",
        border: "2px solid rgba(255,255,255,0.14)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 600,
        fontSize: Math.round(size * 0.3),
      }}
    >
      {initialsOf(EXAMPLE_CARD.fullName)}
    </div>
  );
}

export function PrintMocks({ qr }: { qr: QrSymbol }) {
  const qrTile = <QrSvg symbol={qr} label="Example card QR code" padding={5} />;

  return (
    <div className={styles.printMocks}>
      <figure style={{ margin: 0 }}>
        <div className={styles.mockCr80}>
          <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
            <p className={styles.mockLabel}>{EXAMPLE_CARD.role.toUpperCase()}</p>
            <p className={styles.mockName}>{displayName(EXAMPLE_CARD)}</p>
            <p className={styles.mockMeta}>{EXAMPLE_CARD.company}</p>
            <p className={styles.mockMeta} style={{ marginTop: "auto" }}>
              {EXAMPLE_CARD.phone}
            </p>
            <p className={styles.mockMeta}>{EXAMPLE_CARD.email}</p>
          </div>
          <div className={styles.mockQr}>{qrTile}</div>
        </div>
        <figcaption className={styles.mockCaption}>Standard ID Card — CR80</figcaption>
      </figure>
      <figure style={{ margin: 0 }}>
        <div className={styles.mockBadge}>
          <p className={styles.mockLabel}>
            <BrandMark iconSize={12} />
          </p>
          <div style={{ marginTop: 10 }}>
            <MockAvatar size={44} />
          </div>
          <p className={styles.mockName} style={{ marginTop: 8 }}>
            {displayName(EXAMPLE_CARD)}
            {EXAMPLE_CARD.pronouns !== undefined && (
              <span className={styles.mockPronouns}>({EXAMPLE_CARD.pronouns})</span>
            )}
          </p>
          <p className={styles.mockMeta}>{EXAMPLE_CARD.role}</p>
          {EXAMPLE_CARD.headline !== undefined && (
            <p className={styles.mockHeadline}>{EXAMPLE_CARD.headline}</p>
          )}
          <div className={styles.mockBadgeQr}>{qrTile}</div>
          <p className={styles.mockMeta} style={{ marginTop: 6 }}>
            Scan to connect
          </p>
        </div>
        <figcaption className={styles.mockCaption}>Event Badge — 4 × 6 in</figcaption>
      </figure>
    </div>
  );
}
