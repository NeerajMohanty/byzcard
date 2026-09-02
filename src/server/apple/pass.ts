/**
 * Apple Wallet .pkpass assembly (Generic Pass), server-only.
 * The pass is built entirely in memory from the request and returned —
 * nothing is persisted, logged, or cached.
 */
import { createHash } from "node:crypto";
import { displayUrl, type CardFields } from "@/core/card/types";
import { signDetachedCms } from "../cms";
import { pemToDer } from "../der";
import type { AppleWalletConfig } from "../env";
import { solidPng } from "../png";
import { buildZip, type ZipEntry } from "../zip";

/** Card surface colors — matches the BYZCARD visual design. */
const BACKGROUND = "rgb(11,18,32)";
const FOREGROUND = "rgb(255,255,255)";
const LABEL = "rgb(148,163,184)";
const ICON_RGB: readonly [number, number, number] = [11, 18, 32];

export interface ApplePassInput {
  config: AppleWalletConfig;
  fields: CardFields;
  shareUrl: string;
  serialNumber: string;
  /** Optimized square PNG bytes (validated upstream). */
  photoPng?: Uint8Array;
}

interface PassField {
  key: string;
  label: string;
  value: string;
}

function buildPassJson(input: ApplePassInput): string {
  const { fields } = input;
  const secondaryFields: PassField[] = [
    { key: "phone", label: "PHONE", value: fields.phone },
    { key: "email", label: "EMAIL", value: fields.email },
  ];
  const auxiliaryFields: PassField[] = [];
  if (fields.website !== undefined) {
    auxiliaryFields.push({ key: "website", label: "WEBSITE", value: displayUrl(fields.website) });
  }
  const pass = {
    formatVersion: 1,
    passTypeIdentifier: input.config.passTypeId,
    teamIdentifier: input.config.teamId,
    serialNumber: input.serialNumber,
    organizationName: "BYZCARD",
    description: `Business card — ${fields.fullName}`,
    logoText: "BYZCARD",
    foregroundColor: FOREGROUND,
    backgroundColor: BACKGROUND,
    labelColor: LABEL,
    sharingProhibited: false,
    generic: {
      headerFields: [{ key: "company", label: "COMPANY", value: fields.company }],
      primaryFields: [
        { key: "name", label: fields.role.toLocaleUpperCase(), value: fields.fullName },
      ],
      secondaryFields,
      auxiliaryFields,
    },
    barcodes: [
      {
        format: "PKBarcodeFormatQR",
        message: input.shareUrl,
        messageEncoding: "iso-8859-1",
        altText: "Scan to receive this card",
      },
    ],
  };
  return JSON.stringify(pass);
}

function manifestFor(entries: readonly ZipEntry[]): string {
  const manifest: Record<string, string> = {};
  for (const entry of entries) {
    manifest[entry.name] = createHash("sha1").update(entry.data).digest("hex");
  }
  return JSON.stringify(manifest);
}

/** Assemble and sign the complete .pkpass archive. */
export function buildPkpass(input: ApplePassInput): Uint8Array {
  const encoder = new TextEncoder();
  const entries: ZipEntry[] = [
    { name: "pass.json", data: encoder.encode(buildPassJson(input)) },
    { name: "icon.png", data: solidPng(29, ...ICON_RGB) },
    { name: "icon@2x.png", data: solidPng(58, ...ICON_RGB) },
    { name: "icon@3x.png", data: solidPng(87, ...ICON_RGB) },
  ];
  if (input.photoPng !== undefined) {
    // Wallet scales the thumbnail; supplying the optimized square once at
    // @2x quality covers all devices.
    entries.push({ name: "thumbnail.png", data: input.photoPng });
    entries.push({ name: "thumbnail@2x.png", data: input.photoPng });
  }

  const manifestBytes = encoder.encode(manifestFor(entries));
  const [signerCertDer] = pemToDer(input.config.certPem, "CERTIFICATE");
  if (signerCertDer === undefined) throw new Error("Apple pass certificate PEM is invalid");
  const wwdrDer = pemToDer(input.config.wwdrPem, "CERTIFICATE");

  const signature = signDetachedCms({
    content: manifestBytes,
    signerCertDer,
    signerKeyPem: input.config.keyPem,
    signerKeyPassphrase: input.config.keyPassphrase,
    extraCertsDer: wwdrDer,
  });

  return buildZip([
    ...entries,
    { name: "manifest.json", data: manifestBytes },
    { name: "signature", data: signature },
  ]);
}
