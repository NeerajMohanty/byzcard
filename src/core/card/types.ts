/**
 * Core Card domain types.
 * Pure TypeScript — no React, no DOM, no storage, no Wallet dependencies.
 */

export const CARD_SCHEMA_VERSION = 1;

/** Field length limits (characters). Enforced at every boundary. */
export const FIELD_LIMITS = {
  fullName: 80,
  role: 60,
  company: 80,
  phone: 24,
  email: 254,
  website: 120,
  linkedin: 120,
} as const;

export type CardFieldName = keyof typeof FIELD_LIMITS;

/** Raw editable field values as entered by the user. */
export interface CardFields {
  fullName: string;
  role: string;
  company: string;
  phone: string;
  email: string;
  website?: string;
  linkedin?: string;
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

/** Wallet identifiers kept locally so pass regeneration reuses identity. */
export interface WalletIds {
  appleSerialNumber?: string;
  googleObjectSuffix?: string;
}

export interface ValidationIssue {
  field: CardFieldName;
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
