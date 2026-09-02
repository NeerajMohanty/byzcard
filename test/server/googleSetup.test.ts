import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ensureGenericClass,
  readSetupConfig,
  SETUP_CLASS_SUFFIX,
  type SetupConfig,
} from "../../scripts/google-wallet-setup";
import { GOOGLE_CLASS_SUFFIX } from "@/server/google/jwt";

const keyPem = readFileSync(join(process.cwd(), "test", "fixtures", "google-test-key.pem"), "utf8");
const CONFIG: SetupConfig = {
  issuerId: "3388000000000000000",
  saEmail: "test@byzcard-test.iam.gserviceaccount.com",
  keyPem,
};
const CLASS_ID = `3388000000000000000.${SETUP_CLASS_SUFFIX}`;

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Scripted fetch mock: responds per-URL/method, records calls. */
function mockFetch(script: (url: string, init?: RequestInit) => Response): {
  fetchFn: typeof fetch;
  calls: { url: string; method: string }[];
} {
  const calls: { url: string; method: string }[] = [];
  const fetchFn: typeof fetch = (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    calls.push({ url, method: init?.method ?? "GET" });
    return Promise.resolve(script(url, init));
  };
  return { fetchFn, calls };
}

const tokenOk = (): Response => jsonResponse(200, { access_token: "test-token" });

describe("google wallet class setup tool", () => {
  it("stays in sync with the issuance module's class suffix", () => {
    expect(SETUP_CLASS_SUFFIX).toBe(GOOGLE_CLASS_SUFFIX);
  });

  it("reports not-configured when credentials are missing", () => {
    expect(readSetupConfig({})).toBeNull();
    expect(readSetupConfig({ GOOGLE_WALLET_ISSUER_ID: "1" })).toBeNull();
  });

  it("reads inline and file-based credentials", () => {
    const inline = readSetupConfig({
      GOOGLE_WALLET_ISSUER_ID: "123",
      GOOGLE_WALLET_SA_EMAIL: "a@b.iam.gserviceaccount.com",
      GOOGLE_WALLET_SA_KEY_PEM: "-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----",
    });
    expect(inline?.keyPem).toContain("\nabc\n");
    const fromFile = readSetupConfig({
      GOOGLE_WALLET_ISSUER_ID: "123",
      GOOGLE_WALLET_SA_EMAIL: "a@b.iam.gserviceaccount.com",
      GOOGLE_WALLET_SA_KEY_PEM_FILE: join(process.cwd(), "test", "fixtures", "google-test-key.pem"),
    });
    expect(fromFile?.keyPem).toContain("PRIVATE KEY");
  });

  it("creates the class when absent", async () => {
    const { fetchFn, calls } = mockFetch((url, init) => {
      if (url.startsWith("https://oauth2.googleapis.com/token")) return tokenOk();
      if (init?.method === "POST") return jsonResponse(200, { id: CLASS_ID });
      return jsonResponse(404, { error: { code: 404 } });
    });
    const outcome = await ensureGenericClass(CONFIG, fetchFn, 1_700_000_000);
    expect(outcome).toEqual({ status: "created", classId: CLASS_ID });
    // token → GET (404) → POST create
    expect(calls.map((c) => c.method)).toEqual(["POST", "GET", "POST"]);
    expect(calls[1]?.url).toContain(encodeURIComponent(CLASS_ID));
  });

  it("treats an existing matching class as success without creating", async () => {
    const { fetchFn, calls } = mockFetch((url) => {
      if (url.startsWith("https://oauth2.googleapis.com/token")) return tokenOk();
      return jsonResponse(200, { id: CLASS_ID });
    });
    const outcome = await ensureGenericClass(CONFIG, fetchFn, 1_700_000_000);
    expect(outcome).toEqual({ status: "already-exists", classId: CLASS_ID });
    expect(calls).toHaveLength(2); // no create call
  });

  it("treats a create-time 409 race as already-exists", async () => {
    const { fetchFn } = mockFetch((url, init) => {
      if (url.startsWith("https://oauth2.googleapis.com/token")) return tokenOk();
      if (init?.method === "POST") return jsonResponse(409, { error: { code: 409 } });
      return jsonResponse(404, {});
    });
    const outcome = await ensureGenericClass(CONFIG, fetchFn, 1_700_000_000);
    expect(outcome).toEqual({ status: "already-exists", classId: CLASS_ID });
  });

  it("reports an incompatible existing class", async () => {
    const { fetchFn } = mockFetch((url) => {
      if (url.startsWith("https://oauth2.googleapis.com/token")) return tokenOk();
      return jsonResponse(200, { id: "3388000000000000000.something_else" });
    });
    const outcome = await ensureGenericClass(CONFIG, fetchFn, 1_700_000_000);
    expect(outcome.status).toBe("incompatible");
  });

  it("reports authentication failures from the token endpoint", async () => {
    const { fetchFn } = mockFetch(() => jsonResponse(401, { error: "invalid_grant" }));
    const outcome = await ensureGenericClass(CONFIG, fetchFn, 1_700_000_000);
    expect(outcome.status).toBe("auth-failed");
  });

  it("reports authorization failures from the Wallet API", async () => {
    const { fetchFn } = mockFetch((url) => {
      if (url.startsWith("https://oauth2.googleapis.com/token")) return tokenOk();
      return jsonResponse(403, { error: { code: 403 } });
    });
    const outcome = await ensureGenericClass(CONFIG, fetchFn, 1_700_000_000);
    expect(outcome.status).toBe("auth-failed");
  });

  it("reports other Google API failures", async () => {
    const { fetchFn } = mockFetch((url) => {
      if (url.startsWith("https://oauth2.googleapis.com/token")) return tokenOk();
      return jsonResponse(500, { error: { code: 500 } });
    });
    const outcome = await ensureGenericClass(CONFIG, fetchFn, 1_700_000_000);
    expect(outcome).toEqual({
      status: "api-error",
      detail: "class lookup returned HTTP 500",
    });
  });

  it("sends a well-formed signed JWT-bearer token request", async () => {
    let assertion = "";
    const { fetchFn } = mockFetch((url, init) => {
      if (url.startsWith("https://oauth2.googleapis.com/token")) {
        const params = new URLSearchParams(String(init?.body ?? ""));
        assertion = params.get("assertion") ?? "";
        return tokenOk();
      }
      return jsonResponse(200, { id: CLASS_ID });
    });
    await ensureGenericClass(CONFIG, fetchFn, 1_700_000_000);
    const [headerPart = "", claimsPart = ""] = assertion.split(".");
    const decode = (part: string): Record<string, unknown> =>
      JSON.parse(
        Buffer.from(part.replace(/-/gu, "+").replace(/_/gu, "/"), "base64").toString(),
      ) as Record<string, unknown>;
    expect(decode(headerPart)).toEqual({ alg: "RS256", typ: "JWT" });
    const claims = decode(claimsPart);
    expect(claims.iss).toBe(CONFIG.saEmail);
    expect(claims.scope).toBe("https://www.googleapis.com/auth/wallet_object.issuer");
    expect(claims.aud).toBe("https://oauth2.googleapis.com/token");
    expect(claims.exp).toBe(1_700_000_000 + 3600);
  });
});
