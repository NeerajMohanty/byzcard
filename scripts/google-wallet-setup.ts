/**
 * One-time operator setup for Google Wallet: ensures the BYZCARD
 * GenericClass exists for the configured issuer, per Google's production
 * lifecycle (class created once; user save JWTs then carry objects only).
 *
 * Run:  npm run wallet:google:setup
 *
 * Deliberately self-contained (Node built-ins only, no imports from src/)
 * so it runs directly under `node --experimental-strip-types`. A unit test
 * asserts its class suffix stays in sync with src/server/google/jwt.ts.
 * It stores nothing, prints no secrets, and touches no user data.
 */
import { createSign } from "node:crypto";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export const SETUP_CLASS_SUFFIX = "byzcard_v1";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const WALLET_SCOPE = "https://www.googleapis.com/auth/wallet_object.issuer";
const CLASS_BASE_URL = "https://walletobjects.googleapis.com/walletobjects/v1/genericClass";

export interface SetupConfig {
  issuerId: string;
  saEmail: string;
  keyPem: string;
}

export type SetupOutcome =
  | { status: "created"; classId: string }
  | { status: "already-exists"; classId: string }
  | { status: "not-configured" }
  | { status: "incompatible"; classId: string; detail: string }
  | { status: "auth-failed"; detail: string }
  | { status: "api-error"; detail: string };

/** Read credentials from the environment (same variables as the app). */
export function readSetupConfig(env: Record<string, string | undefined>): SetupConfig | null {
  const value = (name: string): string | undefined => {
    const raw = env[name];
    return raw !== undefined && raw.trim() !== "" ? raw : undefined;
  };
  const issuerId = value("GOOGLE_WALLET_ISSUER_ID");
  const saEmail = value("GOOGLE_WALLET_SA_EMAIL");
  const keyFile = value("GOOGLE_WALLET_SA_KEY_PEM_FILE");
  let keyPem = value("GOOGLE_WALLET_SA_KEY_PEM")?.replace(/\\n/gu, "\n");
  if (keyFile !== undefined) {
    try {
      keyPem = readFileSync(keyFile, "utf8");
    } catch {
      return null;
    }
  }
  if (issuerId === undefined || saEmail === undefined || keyPem === undefined) return null;
  return { issuerId, saEmail, keyPem };
}

function base64Url(input: string | Uint8Array): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/gu, "-")
    .replace(/\//gu, "_")
    .replace(/=+$/gu, "");
}

/** Service-account JWT-bearer grant → short-lived access token. */
export async function fetchAccessToken(
  config: SetupConfig,
  fetchFn: typeof fetch,
  nowSeconds: number,
): Promise<{ ok: true; token: string } | { ok: false; detail: string }> {
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64Url(
    JSON.stringify({
      iss: config.saEmail,
      scope: WALLET_SCOPE,
      aud: TOKEN_URL,
      iat: nowSeconds,
      exp: nowSeconds + 3600,
    }),
  );
  const signature = createSign("RSA-SHA256").update(`${header}.${claims}`).sign(config.keyPem);
  const assertion = `${header}.${claims}.${base64Url(signature)}`;

  const response = await fetchFn(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }).toString(),
  });
  if (!response.ok) {
    return { ok: false, detail: `token endpoint returned HTTP ${response.status}` };
  }
  const data = (await response.json()) as { access_token?: unknown };
  if (typeof data.access_token !== "string" || data.access_token === "") {
    return { ok: false, detail: "token endpoint returned no access token" };
  }
  return { ok: true, token: data.access_token };
}

/** Check for the BYZCARD class; create it when absent. Idempotent. */
export async function ensureGenericClass(
  config: SetupConfig,
  fetchFn: typeof fetch,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): Promise<SetupOutcome> {
  const classId = `${config.issuerId}.${SETUP_CLASS_SUFFIX}`;
  const auth = await fetchAccessToken(config, fetchFn, nowSeconds);
  if (!auth.ok) return { status: "auth-failed", detail: auth.detail };
  const headers = { Authorization: `Bearer ${auth.token}` };

  const existing = await fetchFn(`${CLASS_BASE_URL}/${encodeURIComponent(classId)}`, { headers });
  if (existing.status === 200) {
    const body = (await existing.json()) as { id?: unknown };
    if (body.id === classId) return { status: "already-exists", classId };
    return {
      status: "incompatible",
      classId,
      detail: `existing class reports id ${String(body.id)}`,
    };
  }
  if (existing.status === 401 || existing.status === 403) {
    return {
      status: "auth-failed",
      detail: `Google rejected the credentials (HTTP ${existing.status}) — check that the service account is authorized for this issuer`,
    };
  }
  if (existing.status !== 404) {
    return { status: "api-error", detail: `class lookup returned HTTP ${existing.status}` };
  }

  const created = await fetchFn(CLASS_BASE_URL, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ id: classId }),
  });
  if (created.ok) return { status: "created", classId };
  if (created.status === 409) return { status: "already-exists", classId };
  if (created.status === 401 || created.status === 403) {
    return { status: "auth-failed", detail: `class creation rejected (HTTP ${created.status})` };
  }
  return { status: "api-error", detail: `class creation returned HTTP ${created.status}` };
}

export async function main(): Promise<number> {
  const config = readSetupConfig(process.env);
  if (config === null) {
    console.error(
      "Google Wallet is not configured. Set GOOGLE_WALLET_ISSUER_ID, " +
        "GOOGLE_WALLET_SA_EMAIL, and GOOGLE_WALLET_SA_KEY_PEM[_FILE] first " +
        "(see docs/WALLET_SETUP.md).",
    );
    return 1;
  }
  const outcome = await ensureGenericClass(config, fetch);
  switch (outcome.status) {
    case "created":
      console.error(`Created Google Wallet class ${outcome.classId}. Setup complete.`);
      return 0;
    case "already-exists":
      console.error(`Google Wallet class ${outcome.classId} already exists. Nothing to do.`);
      return 0;
    case "incompatible":
      console.error(`Existing class is incompatible: ${outcome.detail}.`);
      return 1;
    case "auth-failed":
      console.error(`Authentication failed: ${outcome.detail}.`);
      return 1;
    case "api-error":
      console.error(`Google Wallet API error: ${outcome.detail}.`);
      return 1;
    case "not-configured":
      return 1;
  }
}

const invokedDirectly =
  typeof process.argv[1] === "string" && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
  main().then(
    (code) => {
      process.exitCode = code;
    },
    (error: unknown) => {
      console.error(`Setup failed: ${error instanceof Error ? error.message : "unknown error"}`);
      process.exitCode = 1;
    },
  );
}
