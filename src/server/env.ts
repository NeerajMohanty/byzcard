/**
 * Server-only environment/configuration access.
 * All Wallet credentials are read here and ONLY here. This module must
 * never be imported from client code — the runtime guard below enforces it
 * (equivalent of the `server-only` package, without the dependency).
 */
import { readFileSync } from "node:fs";

if (typeof window !== "undefined") {
  throw new Error("src/server/env.ts was imported in a browser bundle — this must never happen");
}

function env(name: string): string | undefined {
  const value = process.env[name];
  return value !== undefined && value.trim() !== "" ? value : undefined;
}

/** Read a PEM either inline (\n-escaped allowed) or from a file path. */
function pem(inlineName: string, fileName: string): string | undefined {
  const file = env(fileName);
  if (file !== undefined) {
    try {
      return readFileSync(file, "utf8");
    } catch {
      return undefined;
    }
  }
  const inline = env(inlineName);
  return inline?.replace(/\\n/gu, "\n");
}

export function appUrl(): string {
  return env("NEXT_PUBLIC_APP_URL") ?? "http://localhost:3000";
}

export interface AppleWalletConfig {
  teamId: string;
  passTypeId: string;
  certPem: string;
  keyPem: string;
  keyPassphrase?: string;
  wwdrPem: string;
}

export function appleWalletConfig(): AppleWalletConfig | null {
  const teamId = env("APPLE_TEAM_ID");
  const passTypeId = env("APPLE_PASS_TYPE_ID");
  const certPem = pem("APPLE_PASS_CERT_PEM", "APPLE_PASS_CERT_PEM_FILE");
  const keyPem = pem("APPLE_PASS_KEY_PEM", "APPLE_PASS_KEY_PEM_FILE");
  const wwdrPem = pem("APPLE_WWDR_CERT_PEM", "APPLE_WWDR_CERT_PEM_FILE");
  if (
    teamId === undefined ||
    passTypeId === undefined ||
    certPem === undefined ||
    keyPem === undefined ||
    wwdrPem === undefined
  ) {
    return null;
  }
  return {
    teamId,
    passTypeId,
    certPem,
    keyPem,
    keyPassphrase: env("APPLE_PASS_KEY_PASSPHRASE"),
    wwdrPem,
  };
}

export interface GoogleWalletConfig {
  issuerId: string;
  saEmail: string;
  keyPem: string;
}

export function googleWalletConfig(): GoogleWalletConfig | null {
  const issuerId = env("GOOGLE_WALLET_ISSUER_ID");
  const saEmail = env("GOOGLE_WALLET_SA_EMAIL");
  const keyPem = pem("GOOGLE_WALLET_SA_KEY_PEM", "GOOGLE_WALLET_SA_KEY_PEM_FILE");
  if (issuerId === undefined || saEmail === undefined || keyPem === undefined) return null;
  return { issuerId, saEmail, keyPem };
}
