/**
 * Tappable actions derived from a card's optional links. Pure functions —
 * no DOM, no I/O. One source of truth for every surface that lists the
 * links (card chips, Quick Access), so the dedicated LinkedIn field and the
 * Social / Messaging / Links groups can never fall out of sync again.
 */
import { linkEntryLabel, type CardFields, type LinkGroup } from "./types";
import { normalizeWebUrl } from "./validate";

export interface CardLink {
  /** Stable key for list rendering. */
  key: string;
  /** Service id from LINK_SERVICES ("linkedin", "github", "custom"…) — picks the icon. */
  service: string;
  /** Short label: the service name, or the hostname for custom links. */
  label: string;
  /** Normalized https/http URL, safe to use directly as an anchor href. */
  href: string;
}

/** The link-bearing subset of a card (raw editor values are accepted too). */
export type CardLinkFields = Pick<CardFields, "linkedin" | "social" | "messaging" | "links">;

const LINK_GROUPS: readonly LinkGroup[] = ["social", "messaging", "links"];

/**
 * A safe external href for a stored or typed link value, or null.
 * Missing schemes become https ("github.com/user" → "https://github.com/user");
 * anything that is not plain http(s) web (javascript:, data:, file:…) is refused.
 */
export function safeExternalUrl(raw: string | undefined): string | null {
  if (raw === undefined) return null;
  return normalizeWebUrl(raw);
}

/** `tel:` href for a display phone number (digits and a leading + only). */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^+0-9]/gu, "")}`;
}

/** `mailto:` href for an email address. */
export function mailtoHref(email: string): string {
  return `mailto:${email}`;
}

/**
 * Comparison form of a destination: scheme-insensitive, host case- and
 * "www."-insensitive, trailing slash ignored. Used only to detect the same
 * destination listed twice — hrefs themselves are never rewritten.
 */
function destinationKey(href: string): string {
  const url = new URL(href);
  const host = url.hostname.replace(/^www\./u, "");
  const path = url.pathname.replace(/\/+$/u, "");
  return `${host}${path}${url.search}`;
}

/**
 * Every tappable optional link of a card, in display order: the dedicated
 * LinkedIn field first, then Social, Messaging and Links entries. Entries
 * with no valid web URL (e.g. still being typed) are skipped, and the same
 * destination appears only once even when several fields point to it.
 */
export function cardLinks(fields: CardLinkFields): CardLink[] {
  const result: CardLink[] = [];
  const seen = new Set<string>();
  const add = (key: string, service: string, label: string, raw: string | undefined): void => {
    const href = safeExternalUrl(raw);
    if (href === null) return;
    const destination = destinationKey(href);
    if (seen.has(destination)) return;
    seen.add(destination);
    result.push({ key, service, label, href });
  };
  add("linkedin", "linkedin", "LinkedIn", fields.linkedin);
  for (const group of LINK_GROUPS) {
    (fields[group] ?? []).forEach((entry, index) => {
      add(`${group}-${index}`, entry.service, linkEntryLabel(group, entry), entry.value);
    });
  }
  return result;
}
