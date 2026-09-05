import { Fragment } from "react";
import type { QrSymbol } from "@/core/qr";
import { cardLinks, mailtoHref, safeExternalUrl, telHref, type CardLink } from "@/core/card/links";
import { displayName, displayUrl, type LinkEntry, type PhotoCrop } from "@/core/card/types";
import { Avatar } from "./Avatar";
import { QrSvg } from "./QrSvg";
import { ContactIcon, ServiceIcon, type ContactIconKind } from "./ServiceIcon";
import styles from "./CardView.module.css";

/** Raw display values — may be empty strings during live editing. */
export interface CardViewFields {
  fullName: string;
  role: string;
  company: string;
  phone: string;
  email: string;
  website?: string;
  linkedin?: string;
  preferredName?: string;
  pronouns?: string;
  headline?: string;
  social?: LinkEntry[];
  messaging?: LinkEntry[];
  links?: LinkEntry[];
}

/** Where the card renders: on screen, or on one of the two physical print formats. */
export type CardVariant = "screen" | "cr80" | "badge";

/** Circular photo diameter per variant (px; print variants are physical sizes). */
const AVATAR_SIZE: Record<CardVariant, number> = { screen: 104, cr80: 46, badge: 112 };
const QR_QUIET_ZONE: Record<CardVariant, number> = { screen: 10, cr80: 6, badge: 12 };

interface CardViewProps {
  fields: CardViewFields;
  photoUrl: string | null;
  qr: QrSymbol | null;
  photoCrop?: PhotoCrop;
  /** Natural photo aspect (width / height); square assumed when unknown. */
  photoAspect?: number;
  /**
   * Make phone, email, website and the Quick Access tiles real links
   * (tel:, mailto:, https). Off for the live editor preview, print and the
   * landing example, where the same tiles render as plain text.
   */
  interactive?: boolean;
  variant?: CardVariant;
}

const EXTERNAL = { target: "_blank", rel: "noopener noreferrer" } as const;

interface ContactRowProps {
  label: string;
  icon: ContactIconKind;
  value: string;
  /** Live-preview text for an empty required field; optional rows pass none. */
  placeholder?: string;
  href: string | null;
  external?: boolean;
}

function ContactRow({ label, icon, value, placeholder, href, external = false }: ContactRowProps) {
  if (value === "" && placeholder === undefined) return null;
  let text: React.ReactNode = value;
  if (value === "") text = <span className={styles.placeholder}>{placeholder}</span>;
  else if (href !== null) {
    text = (
      <a className={styles.contactLink} href={href} {...(external ? EXTERNAL : {})}>
        {value}
      </a>
    );
  }
  return (
    <li className={styles.contactItem}>
      <span className={styles.contactIcon} aria-hidden="true">
        <ContactIcon kind={icon} />
      </span>
      <span className="visually-hidden">{label}</span>
      <span className={styles.contactValue}>{text}</span>
    </li>
  );
}

/** Hostname labels get a soft break before each dot ("ada.example" / ".org"). */
function breakableLabel(label: string): React.ReactNode {
  return label.split(".").map((part, index) =>
    index === 0 ? (
      part
    ) : (
      <Fragment key={index}>
        <wbr />.{part}
      </Fragment>
    ),
  );
}

function QuickTile({ link, interactive }: { link: CardLink; interactive: boolean }) {
  const inner = (
    <>
      <span className={styles.quickIcon} aria-hidden="true">
        <ServiceIcon service={link.service} />
      </span>
      <span className={styles.quickLabel}>{breakableLabel(link.label)}</span>
    </>
  );
  if (!interactive) return <span className={styles.quickItem}>{inner}</span>;
  return (
    <a className={styles.quickItem} href={link.href} title={displayUrl(link.href)} {...EXTERNAL}>
      {inner}
    </a>
  );
}

/**
 * The Byzcard ID card — the single source of truth for the card's look,
 * used by the card screen, the live editor preview, the recipient page,
 * the landing example and both print formats. One outer container holds
 * two sections: the dark profile (company, photo, role, name, pronouns,
 * tagline, contact rows, QR) and the light Quick Access grid of the card's
 * optional links, which is omitted entirely when there are none.
 */
export function CardView({
  fields,
  photoUrl,
  qr,
  photoCrop,
  photoAspect,
  interactive = false,
  variant = "screen",
}: CardViewProps) {
  const website = fields.website !== undefined && fields.website !== "" ? fields.website : null;
  const pronouns = fields.pronouns !== undefined && fields.pronouns !== "" ? fields.pronouns : null;
  const headline = fields.headline !== undefined && fields.headline !== "" ? fields.headline : null;
  const links = cardLinks(fields);
  const nameEmpty = fields.fullName === "" && (fields.preferredName ?? "") === "";

  return (
    <article
      className={styles.card}
      data-variant={variant}
      aria-label={variant === "screen" ? "Business card preview" : "Printed business card"}
    >
      <section className={styles.profile} data-part="profile">
        <div className={styles.photo}>
          <Avatar
            fullName={fields.fullName}
            photoUrl={photoUrl}
            size={AVATAR_SIZE[variant]}
            crop={photoCrop}
            aspect={photoAspect}
            shape="circle"
          />
        </div>
        <p className={styles.company}>
          {fields.company === "" ? (
            <span className={styles.placeholder}>Company Name</span>
          ) : (
            fields.company
          )}
        </p>
        <p className={styles.role}>{fields.role === "" ? "Role" : fields.role}</p>
        <h2 className={styles.name}>
          {nameEmpty ? <span className={styles.placeholder}>Your Name</span> : displayName(fields)}
          {pronouns !== null && (
            <>
              {" "}
              <span className={styles.pronouns}>({pronouns})</span>
            </>
          )}
        </h2>
        {headline !== null && <p className={styles.tagline}>{headline}</p>}

        <div className={styles.divider} aria-hidden="true" />

        <div className={styles.contactRow}>
          <ul className={styles.contactList}>
            <ContactRow
              label="Phone"
              icon="phone"
              value={fields.phone}
              placeholder="+1 000 000 0000"
              href={interactive && fields.phone !== "" ? telHref(fields.phone) : null}
            />
            <ContactRow
              label="Email"
              icon="mail"
              value={fields.email}
              placeholder="you@example.com"
              href={interactive && fields.email !== "" ? mailtoHref(fields.email) : null}
            />
            {website !== null && (
              <ContactRow
                label="Website"
                icon="globe"
                value={displayUrl(website)}
                href={interactive ? safeExternalUrl(website) : null}
                external
              />
            )}
          </ul>
          {qr !== null && (
            <div className={styles.qrCol}>
              <div className={styles.qrBox} data-part="qr">
                <QrSvg
                  symbol={qr}
                  label="QR code linking to this business card"
                  padding={QR_QUIET_ZONE[variant]}
                />
              </div>
              {variant === "badge" && <p className={styles.scanHint}>Scan to connect</p>}
            </div>
          )}
        </div>
      </section>

      {links.length > 0 && (
        <section className={styles.quick} data-part="quick" aria-label="Quick Access">
          <h3 className={styles.quickTitle}>Quick Access</h3>
          <ul className={styles.quickGrid}>
            {links.map((link) => (
              <li key={link.key} className={styles.quickCell}>
                <QuickTile link={link} interactive={interactive} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
