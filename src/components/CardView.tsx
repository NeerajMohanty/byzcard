import type { QrSymbol } from "@/core/qr";
import { displayUrl } from "@/core/card/types";
import { Avatar } from "./Avatar";
import { QrSvg } from "./QrSvg";
import styles from "./CardView.module.css";

/** Raw display values — may be empty strings during live editing. */
export interface CardViewFields {
  fullName: string;
  role: string;
  company: string;
  phone: string;
  email: string;
  website?: string;
}

interface CardViewProps {
  fields: CardViewFields;
  photoUrl: string | null;
  qr: QrSymbol | null;
}

function Value({ value, placeholder }: { value: string; placeholder: string }) {
  if (value === "")
    return <p className={`${styles.contactValue} ${styles.placeholder}`}>{placeholder}</p>;
  return <p className={styles.contactValue}>{value}</p>;
}

/**
 * The Wallet-style business card. Single source of truth for the card's
 * look: used by the live editor preview, the local card screen, and the
 * landing example — never duplicated.
 */
export function CardView({ fields, photoUrl, qr }: CardViewProps) {
  const website = fields.website !== undefined && fields.website !== "" ? fields.website : null;
  return (
    <article className={styles.card} aria-label="Business card preview">
      <header className={styles.header}>
        <div className={styles.headerStack}>
          <p className={styles.label}>Company</p>
          <p className={styles.companyName}>
            {fields.company === "" ? (
              <span className={styles.placeholder}>Company Name</span>
            ) : (
              fields.company
            )}
          </p>
        </div>
      </header>

      <div className={styles.identity}>
        <div className={styles.identityText}>
          <p className={styles.label}>{fields.role === "" ? "Role" : fields.role}</p>
          <h2 className={styles.name}>
            {fields.fullName === "" ? (
              <span className={styles.placeholder}>Your Name</span>
            ) : (
              fields.fullName
            )}
          </h2>
        </div>
        <Avatar fullName={fields.fullName} photoUrl={photoUrl} size={96} />
      </div>

      <div className={styles.contact}>
        <div>
          <p className={styles.label}>Phone</p>
          <Value value={fields.phone} placeholder="+1 000 000 0000" />
        </div>
        <div>
          <p className={styles.label}>Email</p>
          <Value value={fields.email} placeholder="you@example.com" />
        </div>
        <div>
          <p className={styles.label}>Website</p>
          {website !== null ? (
            <Value value={displayUrl(website)} placeholder="" />
          ) : (
            // Presentation-only placeholder: the em dash exists purely in
            // this view and is never stored, shared, or exported.
            <p className={styles.contactValue} aria-label="No website provided">
              —
            </p>
          )}
        </div>
      </div>

      {qr !== null && (
        <div className={styles.qrWrap}>
          <div className={styles.qrBox}>
            <QrSvg symbol={qr} label="QR code linking to this business card" />
          </div>
        </div>
      )}
    </article>
  );
}
