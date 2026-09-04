/**
 * Core Card domain types.
 * Pure TypeScript — no React, no DOM, no storage, no Wallet dependencies.
 */

export const CARD_SCHEMA_VERSION = 1;

/** Field length limits (characters). Enforced at every boundary. */
export const FIELD_LIMITS = {
  fullName: 80,
  preferredName: 40,
  pronouns: 24,
  role: 60,
  headline: 80,
  company: 80,
  phone: 24,
  email: 254,
  website: 120,
  linkedin: 120,
} as const;

export type CardFieldName = keyof typeof FIELD_LIMITS;

/** One optional social/messaging/link entry (value is a normalized URL). */
export interface LinkEntry {
  service: string;
  value: string;
}

/** Maximum characters for one link entry's URL. */
export const LINK_VALUE_LIMIT = 120;

/** Optional link groups and their V1 entry caps (QR budget protection). */
export const OPTIONAL_LINK_LIMITS = {
  social: 3,
  messaging: 2,
  links: 3,
} as const;

export type LinkGroup = keyof typeof OPTIONAL_LINK_LIMITS;

export interface LinkService {
  id: string;
  label: string;
  /** Single-character wire code for the share payload. */
  code: string;
}

/** Curated V1 services per group (small on purpose; "custom" always last). */
export const LINK_SERVICES: Record<LinkGroup, readonly LinkService[]> = {
  social: [
    { id: "linkedin", label: "LinkedIn", code: "l" },
    { id: "instagram", label: "Instagram", code: "i" },
    { id: "x", label: "X", code: "x" },
    { id: "facebook", label: "Facebook", code: "f" },
    { id: "youtube", label: "YouTube", code: "y" },
    { id: "tiktok", label: "TikTok", code: "t" },
    { id: "threads", label: "Threads", code: "h" },
    { id: "custom", label: "Custom", code: "c" },
  ],
  messaging: [
    { id: "whatsapp", label: "WhatsApp", code: "w" },
    { id: "signal", label: "Signal", code: "s" },
    { id: "telegram", label: "Telegram", code: "g" },
    { id: "discord", label: "Discord", code: "d" },
    { id: "custom", label: "Custom", code: "c" },
  ],
  links: [
    { id: "github", label: "GitHub", code: "b" },
    { id: "calendly", label: "Calendly", code: "a" },
    { id: "portfolio", label: "Portfolio", code: "p" },
    { id: "custom", label: "Custom", code: "c" },
  ],
};

/** Preset pronoun choices ("custom" and "prefer not to say" are UI states). */
export const PRONOUN_CHOICES = [
  "he/him",
  "she/her",
  "they/them",
  "he/they",
  "she/they",
  "any pronouns",
] as const;

/** Raw editable field values as entered by the user. */
export interface CardFields {
  fullName: string;
  role: string;
  company: string;
  phone: string;
  email: string;
  website?: string;
  linkedin?: string;
  /** Optional display-only name; fullName stays the canonical identity. */
  preferredName?: string;
  pronouns?: string;
  headline?: string;
  social?: LinkEntry[];
  messaging?: LinkEntry[];
  links?: LinkEntry[];
}

/** The name shown on cards: preferred name when present, else full name. */
export function displayName(fields: Pick<CardFields, "fullName" | "preferredName">): string {
  return fields.preferredName !== undefined && fields.preferredName !== ""
    ? fields.preferredName
    : fields.fullName;
}

/** Human label for a link entry ("custom" falls back to its hostname). */
export function linkEntryLabel(group: LinkGroup, entry: LinkEntry): string {
  const service = LINK_SERVICES[group].find((s) => s.id === entry.service);
  if (service !== undefined && service.id !== "custom") return service.label;
  try {
    return new URL(entry.value).hostname.replace(/^www\./u, "");
  } catch {
    return "Link";
  }
}

/** A validated, normalized card as persisted locally. */
export interface Card extends CardFields {
  schemaVersion: typeof CARD_SCHEMA_VERSION;
  id: string;
  createdAt: string;
  updatedAt: string;
}

/** Local-only metadata about the optimized photo blob. */
export interface PhotoMeta {
  mimeType: string;
  width: number;
  height: number;
  byteSize: number;
}

/**
 * Local-only photo framing inside the 4:5 portrait window.
 * Never part of the share payload, vCard, or Wallet passes.
 */
export interface PhotoCrop {
  /** Horizontal shift, -1..1 (fraction of the frame's pan range). */
  x: number;
  /** Vertical shift, -1..1. */
  y: number;
  /** Magnification, 1..2.5. */
  zoom: number;
}

export const DEFAULT_PHOTO_CROP: PhotoCrop = { x: 0, y: 0, zoom: 1 };

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function clampPhotoCrop(crop: PhotoCrop): PhotoCrop {
  const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
  return { x: clamp(crop.x, -1, 1), y: clamp(crop.y, -1, 1), zoom: clamp(crop.zoom, 1, 2.5) };
}

export function isPhotoCrop(value: unknown): value is PhotoCrop {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return isFiniteNumber(record.x) && isFiniteNumber(record.y) && isFiniteNumber(record.zoom);
}

/** Wallet identifiers kept locally so pass regeneration reuses identity. */
export interface WalletIds {
  appleSerialNumber?: string;
  googleObjectSuffix?: string;
}

export interface ValidationIssue {
  field: CardFieldName | LinkGroup;
  message: string;
}

export type ValidationResult =
  { ok: true; fields: CardFields } | { ok: false; issues: ValidationIssue[] };

/** Derive up to two initials for the avatar fallback. */
export function initialsOf(fullName: string): string {
  const parts = fullName
    .trim()
    .split(/\s+/u)
    .filter((p) => p.length > 0);
  if (parts.length === 0) return "?";
  const first = [...(parts[0] ?? "")][0] ?? "";
  const last = parts.length > 1 ? ([...(parts[parts.length - 1] ?? "")][0] ?? "") : "";
  const result = (first + last).toLocaleUpperCase();
  return result === "" ? "?" : result;
}

/** Display form of a website URL (strips scheme and trailing slash). */
export function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//u, "").replace(/\/$/u, "");
}
