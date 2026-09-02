/**
 * SharePayloadV1 — the versioned, self-contained wire format for a shared
 * card. Text fields only (never the photo). Encoded into a URL fragment so
 * card data is never transmitted to any server (fragments stay client-side).
 *
 * Fragment grammar:  <flag><base64url>
 *   flag "d" — deflate-raw compressed JSON array
 *   flag "p" — plain JSON array
 * JSON array (positional, trailing empties trimmed):
 *   [1, fullName, role, company, phone, email, website, linkedin]
 */
import type { CardFields } from "../card/types";
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

export interface SharePayloadV1 extends CardFields {
  version: typeof SHARE_PAYLOAD_VERSION;
}

export type ShareDecodeError =
  "empty" | "format" | "unsupported-version" | "decompress-unavailable" | "invalid-fields";

export type ShareDecodeResult =
  { ok: true; payload: SharePayloadV1 } | { ok: false; error: ShareDecodeError };

function toPositionalArray(fields: CardFields): (string | number)[] {
  const arr: (string | number)[] = [
    SHARE_PAYLOAD_VERSION,
    fields.fullName,
    fields.role,
    fields.company,
    fields.phone,
    fields.email,
    fields.website ?? "",
    fields.linkedin ?? "",
  ];
  while (arr.length > 6 && arr[arr.length - 1] === "") arr.pop();
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

function parsePositionalArray(json: string): SharePayloadV1 | "format" | "unsupported-version" {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return "format";
  }
  if (!Array.isArray(parsed) || parsed.length < 6) return "format";
  if (parsed[0] !== SHARE_PAYLOAD_VERSION) return "unsupported-version";
  const strings = parsed.slice(1);
  if (!strings.every((v): v is string => typeof v === "string")) return "format";
  const [
    fullName = "",
    role = "",
    company = "",
    phone = "",
    email = "",
    website = "",
    linkedin = "",
  ] = strings;
  const validated = validateCardFields({
    fullName,
    role,
    company,
    phone,
    email,
    website,
    linkedin,
  });
  if (!validated.ok) return "format";
  return { version: SHARE_PAYLOAD_VERSION, ...validated.fields };
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
