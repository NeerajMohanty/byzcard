"use client";

/**
 * Print-only render targets for the two V1 formats. Everything is built
 * from local data — printing uploads nothing and involves no server.
 * The dynamic @page rule gives the browser's Save-as-PDF the exact
 * physical page size for the selected format.
 */
import type { Card } from "@/core/card/types";
import { displayUrl } from "@/core/card/types";
import type { QrSymbol } from "@/core/qr";
import { Avatar } from "@/components/Avatar";
import { QrSvg } from "@/components/QrSvg";
import styles from "./print.module.css";

export type PrintFormat = "cr80" | "badge";

export const PRINT_PAGE_SIZES: Record<PrintFormat, string> = {
  cr80: "3.375in 2.125in",
  badge: "4in 6in",
};

interface SheetProps {
  card: Card;
  photoUrl: string | null;
  qr: QrSymbol;
}

/** Standard ID card — CR80 landscape (wallet/PVC/cardstock). */
function Cr80Sheet({ card, photoUrl, qr }: SheetProps) {
  return (
    <div className={styles.cr80} data-print-format="cr80">
      <div className={styles.cr80Left}>
        <p className={styles.cr80Role}>{card.role}</p>
        <p className={styles.cr80Name}>{card.fullName}</p>
        <p className={styles.cr80Company}>{card.company}</p>
        <div className={styles.cr80Contact}>
          <div>
            <p className={styles.printLabel}>Phone</p>
            <p className={styles.cr80Value}>{card.phone}</p>
          </div>
          <div>
            <p className={styles.printLabel}>Email</p>
            <p className={styles.cr80Value}>{card.email}</p>
          </div>
          <div>
            <p className={styles.printLabel}>Website</p>
            {/* Em dash is presentation-only; it never enters data. */}
            <p className={styles.cr80Value}>
              {card.website !== undefined ? displayUrl(card.website) : "—"}
            </p>
          </div>
        </div>
        <p className={styles.cr80Brand}>BYZCARD</p>
      </div>
      <div className={styles.cr80Right}>
        <Avatar fullName={card.fullName} photoUrl={photoUrl} size={50} />
        <div className={styles.cr80Qr}>
          <QrSvg symbol={qr} label="QR code linking to this business card" padding={8} />
        </div>
      </div>
    </div>
  );
}

/** Event badge — 4 × 6 in portrait, identity-at-a-distance layout. */
function BadgeSheet({ card, photoUrl, qr }: SheetProps) {
  return (
    <div className={styles.badge} data-print-format="badge">
      <p className={styles.badgeBrandTop}>BYZCARD</p>
      <Avatar fullName={card.fullName} photoUrl={photoUrl} size={128} />
      <p className={styles.badgeName}>{card.fullName}</p>
      <p className={styles.badgeRole}>{card.role}</p>
      <p className={styles.badgeCompany}>{card.company}</p>
      <div className={styles.badgeQr}>
        <QrSvg symbol={qr} label="QR code linking to this business card" padding={14} />
      </div>
      <p className={styles.badgeScan}>Scan to connect</p>
    </div>
  );
}

interface PrintSheetsProps {
  format: PrintFormat;
  card: Card;
  photoUrl: string | null;
  qr: QrSymbol | null;
}

/** Rendered outside the screen UI; visible only under `@media print`. */
export function PrintSheets({ format, card, photoUrl, qr }: PrintSheetsProps) {
  if (qr === null) return null;
  return (
    <div className="printOnly">
      <style>{`@page { size: ${PRINT_PAGE_SIZES[format]}; margin: 0; }`}</style>
      {format === "cr80" ? (
        <Cr80Sheet card={card} photoUrl={photoUrl} qr={qr} />
      ) : (
        <BadgeSheet card={card} photoUrl={photoUrl} qr={qr} />
      )}
    </div>
  );
}
