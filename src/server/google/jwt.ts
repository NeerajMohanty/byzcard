/**
 * Google Wallet Generic Pass "save" JWT, server-only.
 *
 * Production lifecycle (per Google's documented pattern): the Byzcard
 * GenericClass is created ONCE by the operator (`npm run wallet:google:setup`);
 * every user save JWT then contains only a GenericObject referencing that
 * pre-created class. Normal issuance makes zero Google API calls and stores
 * nothing.
 *
 * Signing is RS256 via Node's built-in crypto (no dependencies).
 * The professional photo is intentionally absent: Google Wallet images must
 * be fetched by Google from a hosted URL, which the zero-storage
 * architecture forbids. The pass uses text + QR only.
 */
import { createSign } from "node:crypto";
import { displayUrl, type CardFields } from "@/core/card/types";
import type { GoogleWalletConfig } from "../env";

/** Class identifier suffix — must match the operator setup tool. */
export const GOOGLE_CLASS_SUFFIX = "byzcard_v1";

/** Fully qualified GenericClass id for an issuer. */
export function googleClassId(issuerId: string): string {
  return `${issuerId}.${GOOGLE_CLASS_SUFFIX}`;
}

const HEX_BACKGROUND = "#0b1220";

export interface GooglePassInput {
  config: GoogleWalletConfig;
  fields: CardFields;
  shareUrl: string;
  /** Stable per-card object id suffix (hex serial from the client). */
  objectSuffix: string;
  /** Origins allowed to render the save button. */
  appOrigin: string;
}

function localized(value: string): { defaultValue: { language: string; value: string } } {
  return { defaultValue: { language: "en", value } };
}

function base64UrlFromBytes(bytes: Uint8Array): string {
  return Buffer.from(bytes)
    .toString("base64")
    .replace(/\+/gu, "-")
    .replace(/\//gu, "_")
    .replace(/=+$/gu, "");
}

function buildGenericObject(input: GooglePassInput): Record<string, unknown> {
  const { fields, config } = input;
  const textModulesData: { id: string; header: string; body: string }[] = [
    { id: "company", header: "Company", body: fields.company },
    { id: "phone", header: "Phone", body: fields.phone },
    { id: "email", header: "Email", body: fields.email },
  ];
  if (fields.website !== undefined) {
    textModulesData.push({ id: "website", header: "Website", body: displayUrl(fields.website) });
  }
  const linksModuleData: { uris: { uri: string; description: string; id: string }[] } = {
    uris: [],
  };
  if (fields.website !== undefined) {
    linksModuleData.uris.push({ uri: fields.website, description: "Website", id: "website" });
  }
  if (fields.linkedin !== undefined) {
    linksModuleData.uris.push({ uri: fields.linkedin, description: "LinkedIn", id: "linkedin" });
  }
  return {
    id: `${config.issuerId}.${input.objectSuffix}`,
    classId: googleClassId(config.issuerId),
    state: "ACTIVE",
    hexBackgroundColor: HEX_BACKGROUND,
    cardTitle: localized("Byzcard"),
    header: localized(fields.fullName),
    subheader: localized(fields.role),
    barcode: {
      type: "QR_CODE",
      value: input.shareUrl,
      alternateText: "Scan to receive this card",
    },
    textModulesData,
    ...(linksModuleData.uris.length > 0 ? { linksModuleData } : {}),
  };
}

/** Build the signed save JWT and the pay.google.com save URL. */
export function buildGoogleSaveUrl(input: GooglePassInput): string {
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: input.config.saEmail,
    aud: "google",
    typ: "savetowallet",
    iat: Math.floor(Date.now() / 1000),
    origins: [input.appOrigin],
    payload: {
      // Object only — the class is pre-created once by the operator setup
      // tool, per Google's production guidance. No class is (re)created
      // per user save.
      genericObjects: [buildGenericObject(input)],
    },
  };
  const encoder = new TextEncoder();
  const signingInput = `${base64UrlFromBytes(encoder.encode(JSON.stringify(header)))}.${base64UrlFromBytes(
    encoder.encode(JSON.stringify(payload)),
  )}`;
  const signature = createSign("RSA-SHA256").update(signingInput).sign(input.config.keyPem);
  const jwt = `${signingInput}.${base64UrlFromBytes(Uint8Array.from(signature))}`;
  return `https://pay.google.com/gp/v/save/${jwt}`;
}
