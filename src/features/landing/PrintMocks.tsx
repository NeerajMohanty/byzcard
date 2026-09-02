"use client";

/**
 * Faithful miniature renditions of the two real print formats, using the
 * fictional example data and a genuinely generated QR — no screenshots,
 * no fake assets.
 */
import { EXAMPLE_CARD } from "./exampleData";
import { QrSvg } from "@/components/QrSvg";
import { initialsOf } from "@/core/card/types";
import { useShareQr } from "@/lib/useShareQr";
import styles from "./landing.module.css";

function MockAvatar({ size }: { size: number }) {
  return (
    <div
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "linear-gradient(135deg, #1d2942 0%, #131b30 100%)",
        border: "2px solid rgba(255,255,255,0.14)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 600,
        fontSize: Math.round(size * 0.34),
      }}
    >
      {initialsOf(EXAMPLE_CARD.fullName)}
    </div>
  );
}

export function PrintMocks() {
  const { state } = useShareQr(EXAMPLE_CARD);
  const qr = state?.qr ?? null;
  const qrTile =
    qr !== null ? (
      <QrSvg symbol={qr} label="Example card QR code" padding={5} />
    ) : (
      <div style={{ aspectRatio: "1 / 1", background: "#ffffff", borderRadius: 8 }} />
    );

  return (
    <div className={styles.printMocks}>
      <figure style={{ margin: 0 }}>
        <div className={styles.mockCr80}>
          <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
            <p className={styles.mockLabel}>{EXAMPLE_CARD.role.toUpperCase()}</p>
            <p className={styles.mockName}>{EXAMPLE_CARD.fullName}</p>
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
          <p className={styles.mockLabel}>BYZCARD</p>
          <div style={{ marginTop: 10 }}>
            <MockAvatar size={44} />
          </div>
          <p className={styles.mockName} style={{ marginTop: 8 }}>
            {EXAMPLE_CARD.fullName}
          </p>
          <p className={styles.mockMeta}>{EXAMPLE_CARD.role}</p>
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
