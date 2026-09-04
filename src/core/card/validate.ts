/**
 * Card field validation and normalization. Pure functions, no I/O.
 * Every external boundary (editor, share payload, backup import, Wallet
 * request) funnels through validateCardFields.
 */
import {
  CARD_SCHEMA_VERSION,
  FIELD_LIMITS,
  LINK_SERVICES,
  LINK_VALUE_LIMIT,
  OPTIONAL_LINK_LIMITS,
  type Card,
  type CardFields,
  type LinkEntry,
  type LinkGroup,
  type ValidationIssue,
  type ValidationResult,
} from "./types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;
// E.164-ish: optional +, digits, spaces, dashes, dots, parentheses.
const PHONE_RE = /^\+?[0-9()[\]./\s-]{4,}$/u;
// Strips ASCII control characters from user input.
const CONTROL_RE = /[\u0000-\u001F\u007F]/gu;

function clean(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(CONTROL_RE, " ").replace(/\s+/gu, " ").trim();
}

/** Normalize a website/LinkedIn value to a safe https URL, or null. */
export function normalizeWebUrl(raw: string): string | null {
  let value = clean(raw);
  if (value === "") return null;
  if (!/^[a-z][a-z0-9+.-]*:\/\//iu.test(value)) {
    value = `https://${value}`;
  }
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return null;
  }
  // Reject javascript:, data:, file: and anything that is not plain web.
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
  if (!parsed.hostname.includes(".")) return null;
  return parsed.toString().replace(/\/$/u, "");
}

/** Normalize a LinkedIn value: accepts a bare handle or a full URL. */
export function normalizeLinkedin(raw: string): string | null {
  const value = clean(raw);
  if (value === "") return null;
  if (/^[\w-]+$/u.test(value)) {
    return `https://www.linkedin.com/in/${value}`;
  }
  const url = normalizeWebUrl(value);
  if (url === null) return null;
  if (!/(^|\.)linkedin\.com$/u.test(new URL(url).hostname)) return null;
  return url;
}

function checkLength(
  field: keyof typeof FIELD_LIMITS,
  value: string,
  issues: ValidationIssue[],
): void {
  if ([...value].length > FIELD_LIMITS[field]) {
    issues.push({ field, message: `Must be ${FIELD_LIMITS[field]} characters or fewer` });
  }
}

/** Validate one optional link group: allowed service, valid URL, capped. */
function validateLinkGroup(
  group: LinkGroup,
  raw: unknown,
  issues: ValidationIssue[],
): LinkEntry[] | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!Array.isArray(raw)) {
    issues.push({ field: group, message: "Invalid entries" });
    return undefined;
  }
  if (raw.length === 0) return undefined;
  if (raw.length > OPTIONAL_LINK_LIMITS[group]) {
    issues.push({
      field: group,
      message: `Up to ${OPTIONAL_LINK_LIMITS[group]} entries are supported`,
    });
    return undefined;
  }
  const serviceIds = new Set(LINK_SERVICES[group].map((s) => s.id));
  const entries: LinkEntry[] = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null) {
      issues.push({ field: group, message: "Invalid entry" });
      return undefined;
    }
    const record = item as Record<string, unknown>;
    const service = typeof record.service === "string" ? record.service : "";
    const value = typeof record.value === "string" ? record.value : "";
    if (!serviceIds.has(service)) {
      issues.push({ field: group, message: "Choose a service for each entry" });
      return undefined;
    }
    const normalized = normalizeWebUrl(value);
    if (normalized === null || [...normalized].length > LINK_VALUE_LIMIT) {
      issues.push({ field: group, message: "Each entry needs a valid link or URL" });
      return undefined;
    }
    entries.push({ service, value: normalized });
  }
  return entries;
}

/** Validate and normalize raw user input into CardFields. */
export function validateCardFields(input: Record<string, unknown>): ValidationResult {
  const issues: ValidationIssue[] = [];
  const fullName = clean(input.fullName);
  const role = clean(input.role);
  const company = clean(input.company);
  const phone = clean(input.phone);
  const email = clean(input.email);
  const websiteRaw = clean(input.website);
  const linkedinRaw = clean(input.linkedin);

  if (fullName === "") issues.push({ field: "fullName", message: "Name is required" });
  if (role === "") issues.push({ field: "role", message: "Role is required" });
  if (company === "") issues.push({ field: "company", message: "Company is required" });
  if (phone === "") issues.push({ field: "phone", message: "Phone is required" });
  else if (!PHONE_RE.test(phone))
    issues.push({ field: "phone", message: "Enter a valid phone number" });
  if (email === "") issues.push({ field: "email", message: "Email is required" });
  else if (!EMAIL_RE.test(email))
    issues.push({ field: "email", message: "Enter a valid email address" });

  checkLength("fullName", fullName, issues);
  checkLength("role", role, issues);
  checkLength("company", company, issues);
  checkLength("phone", phone, issues);
  checkLength("email", email, issues);

  let website: string | undefined;
  if (websiteRaw !== "") {
    const normalized = normalizeWebUrl(websiteRaw);
    if (normalized === null) issues.push({ field: "website", message: "Enter a valid website" });
    else website = normalized;
  }
  let linkedin: string | undefined;
  if (linkedinRaw !== "") {
    const normalized = normalizeLinkedin(linkedinRaw);
    if (normalized === null)
      issues.push({ field: "linkedin", message: "Enter a LinkedIn URL or handle" });
    else linkedin = normalized;
  }
  if (website !== undefined) checkLength("website", website, issues);
  if (linkedin !== undefined) checkLength("linkedin", linkedin, issues);

  // Optional profile fields — cleaned, length-capped, absent when blank.
  const preferredNameRaw = clean(input.preferredName);
  const pronounsRaw = clean(input.pronouns);
  const headlineRaw = clean(input.headline);
  checkLength("preferredName", preferredNameRaw, issues);
  checkLength("pronouns", pronounsRaw, issues);
  checkLength("headline", headlineRaw, issues);
  const preferredName = preferredNameRaw === "" ? undefined : preferredNameRaw;
  const pronouns = pronounsRaw === "" ? undefined : pronounsRaw;
  const headline = headlineRaw === "" ? undefined : headlineRaw;

  const social = validateLinkGroup("social", input.social, issues);
  const messaging = validateLinkGroup("messaging", input.messaging, issues);
  const links = validateLinkGroup("links", input.links, issues);

  if (issues.length > 0) return { ok: false, issues };
  return {
    ok: true,
    fields: {
      fullName,
      role,
      company,
      phone,
      email,
      website,
      linkedin,
      preferredName,
      pronouns,
      headline,
      social,
      messaging,
      links,
    },
  };
}

/** Build a full Card from validated fields, preserving identity when editing. */
export function buildCard(fields: CardFields, existing?: Pick<Card, "id" | "createdAt">): Card {
  const now = new Date().toISOString();
  return {
    schemaVersion: CARD_SCHEMA_VERSION,
    id: existing?.id ?? generateId(),
    ...fields,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

/** URL-safe random identifier (no crypto dependency on DOM types). */
export function generateId(): string {
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Type guard for a persisted Card object of the current schema. */
export function isStoredCard(value: unknown): value is Card {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  if (record.schemaVersion !== CARD_SCHEMA_VERSION) return false;
  if (typeof record.id !== "string" || record.id === "") return false;
  if (typeof record.createdAt !== "string" || typeof record.updatedAt !== "string") return false;
  return validateCardFields(record).ok;
}
