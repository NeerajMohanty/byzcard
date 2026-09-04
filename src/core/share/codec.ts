/**
 * SharePayload — the versioned, self-contained wire format for a shared
 * card. Text fields only (never the photo). Encoded into a URL fragment so
 * card data is never transmitted to any server (fragments stay client-side).
 *
 * Fragment grammar:  <flag><base64url>
 *   flag "d" — deflate-raw compressed JSON array
 *   flag "p" — plain JSON array
 * V1 JSON array (positional, trailing empties trimmed):
 *   [1, fullName, role, company, phone, email, website, linkedin]
 * V2 appends the optional profile fields (emitted only when any is set):
 *   [2, ...V1 tail, preferredName, pronouns, headline, social, messaging, links]
 * where each link group is an array of [serviceCode, url] pairs using the
 * single-character codes from LINK_SERVICES. V1 links keep decoding forever.
 */
import { LINK_SERVICES, type CardFields, type LinkEntry, type LinkGroup } from "../card/types";
import { validateCardFields } from "../card/validate";
import {
  base64UrlDecode,
  base64UrlEncode,
  compressionSupported,
  decompressionSupported,
  deflateRaw,
  inflateRaw,
  utf8Decode,
  utf8Encode,
} from "./bytes";

export const SHARE_PAYLOAD_VERSION = 1;
export const SHARE_PAYLOAD_VERSION_2 = 2;

export interface SharePayload extends CardFields {
  version: typeof SHARE_PAYLOAD_VERSION | typeof SHARE_PAYLOAD_VERSION_2;
}

/** Backward-compatible alias (V1 consumers predate the union). */
export type SharePayloadV1 = SharePayload;

export type ShareDecodeError =
  "empty" | "format" | "unsupported-version" | "decompress-unavailable" | "invalid-fields";

export type ShareDecodeResult =
  { ok: true; payload: SharePayload } | { ok: false; error: ShareDecodeError };

type Positional = string | number | [string, string][];

function encodeGroup(group: LinkGroup, entries: LinkEntry[] | undefined): [string, string][] {
  if (entries === undefined) return [];
  const codeOf = new Map(LINK_SERVICES[group].map((s) => [s.id, s.code]));
  return entries.map((e) => [codeOf.get(e.service) ?? "c", e.value]);
}

function decodeGroup(group: LinkGroup, raw: unknown): LinkEntry[] | "format" {
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) return "format";
  const idOf = new Map(LINK_SERVICES[group].map((s) => [s.code, s.id]));
  const entries: LinkEntry[] = [];
  for (const item of raw) {
    if (!Array.isArray(item) || typeof item[0] !== "string" || typeof item[1] !== "string") {
      return "format";
    }
    const id = idOf.get(item[0]);
    // Unknown codes from future versions are skipped, not fatal.
    if (id !== undefined) entries.push({ service: id, value: item[1] });
  }
  return entries;
}

function hasProfileExtras(fields: CardFields): boolean {
  return (
    fields.preferredName !== undefined ||
    fields.pronouns !== undefined ||
    fields.headline !== undefined ||
    (fields.social?.length ?? 0) > 0 ||
    (fields.messaging?.length ?? 0) > 0 ||
    (fields.links?.length ?? 0) > 0
  );
}

function toPositionalArray(fields: CardFields): Positional[] {
  const v2 = hasProfileExtras(fields);
  const arr: Positional[] = [
    v2 ? SHARE_PAYLOAD_VERSION_2 : SHARE_PAYLOAD_VERSION,
    fields.fullName,
    fields.role,
    fields.company,
    fields.phone,
    fields.email,
    fields.website ?? "",
    fields.linkedin ?? "",
  ];
  if (v2) {
    arr.push(
      fields.preferredName ?? "",
      fields.pronouns ?? "",
      fields.headline ?? "",
      encodeGroup("social", fields.social),
      encodeGroup("messaging", fields.messaging),
      encodeGroup("links", fields.links),
    );
  }
  const isEmpty = (v: Positional | undefined): boolean =>
    v === "" || (Array.isArray(v) && v.length === 0);
  while (arr.length > 6 && isEmpty(arr[arr.length - 1])) arr.pop();
  return arr;
}

/** Encode card fields into the share fragment (no leading '#'). */
export async function encodeSharePayload(fields: CardFields): Promise<string> {
  const json = JSON.stringify(toPositionalArray(fields));
  const plain = utf8Encode(json);
  if (compressionSupported()) {
    const deflated = await deflateRaw(plain);
    if (deflated.length < plain.length) {
      return `d${base64UrlEncode(deflated)}`;
    }
  }
  return `p${base64UrlEncode(plain)}`;
}

function parsePositionalArray(json: string): SharePayload | "format" | "unsupported-version" {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return "format";
  }
  if (!Array.isArray(parsed) || parsed.length < 6) return "format";
  const version = parsed[0];
  if (version !== SHARE_PAYLOAD_VERSION && version !== SHARE_PAYLOAD_VERSION_2) {
    return "unsupported-version";
  }
  const textCount = version === SHARE_PAYLOAD_VERSION ? parsed.length - 1 : 10;
  const texts = parsed.slice(1, 1 + textCount);
  if (!texts.every((v): v is string => typeof v === "string")) return "format";
  const [
    fullName = "",
    role = "",
    company = "",
    phone = "",
    email = "",
    website = "",
    linkedin = "",
    preferredName = "",
    pronouns = "",
    headline = "",
  ] = texts;

  let social: LinkEntry[] = [];
  let messaging: LinkEntry[] = [];
  let links: LinkEntry[] = [];
  if (version === SHARE_PAYLOAD_VERSION_2) {
    const s = decodeGroup("social", parsed[11]);
    const m = decodeGroup("messaging", parsed[12]);
    const l = decodeGroup("links", parsed[13]);
    if (s === "format" || m === "format" || l === "format") return "format";
    social = s;
    messaging = m;
    links = l;
  }

  const validated = validateCardFields({
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
  });
  if (!validated.ok) return "format";
  return { version, ...validated.fields };
}

/** Decode + validate a share fragment (leading '#' allowed). */
export async function decodeSharePayload(fragment: string): Promise<ShareDecodeResult> {
  const text = fragment.startsWith("#") ? fragment.slice(1) : fragment;
  if (text.length === 0) return { ok: false, error: "empty" };
  const flag = text[0];
  const body = base64UrlDecode(text.slice(1));
  if (body === null || (flag !== "d" && flag !== "p")) return { ok: false, error: "format" };

  let jsonBytes: Uint8Array;
  if (flag === "d") {
    if (!decompressionSupported()) return { ok: false, error: "decompress-unavailable" };
    try {
      jsonBytes = await inflateRaw(body);
    } catch {
      return { ok: false, error: "format" };
    }
  } else {
    jsonBytes = body;
  }

  let json: string;
  try {
    json = utf8Decode(jsonBytes);
  } catch {
    return { ok: false, error: "format" };
  }
  const parsed = parsePositionalArray(json);
  if (parsed === "format") return { ok: false, error: "invalid-fields" };
  if (parsed === "unsupported-version") return { ok: false, error: "unsupported-version" };
  return { ok: true, payload: parsed };
}
