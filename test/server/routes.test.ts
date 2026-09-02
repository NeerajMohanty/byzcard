import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GET as walletConfigGet } from "@/app/api/wallet-config/route";
import { POST as applePost } from "@/app/api/apple-pass/route";
import { POST as googlePost } from "@/app/api/google-pass/route";

const FIXTURES = join(process.cwd(), "test", "fixtures");

function configureApple(): void {
  vi.stubEnv("APPLE_TEAM_ID", "TESTTEAMID");
  vi.stubEnv("APPLE_PASS_TYPE_ID", "pass.test.byzcard");
  vi.stubEnv("APPLE_PASS_CERT_PEM_FILE", join(FIXTURES, "apple-test-cert.pem"));
  vi.stubEnv("APPLE_PASS_KEY_PEM_FILE", join(FIXTURES, "apple-test-key.pem"));
  vi.stubEnv("APPLE_WWDR_CERT_PEM_FILE", join(FIXTURES, "apple-test-wwdr.pem"));
}

function configureGoogle(): void {
  vi.stubEnv("GOOGLE_WALLET_ISSUER_ID", "3388000000000000000");
  vi.stubEnv("GOOGLE_WALLET_SA_EMAIL", "test@byzcard-test.iam.gserviceaccount.com");
  vi.stubEnv("GOOGLE_WALLET_SA_KEY_PEM_FILE", join(FIXTURES, "google-test-key.pem"));
}

afterEach(() => {
  vi.unstubAllEnvs();
});

const VALID_BODY = {
  fields: {
    fullName: "Ada Lovelace",
    role: "Chief Analyst",
    company: "Analytical Engines",
    phone: "+1 647 000 0000",
    email: "ada@example.com",
  },
  serialNumber: "abcdef0123456789",
};

function postRequest(url: string, body: unknown, origin?: string): Request {
  return new Request(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(origin !== undefined ? { Origin: origin } : {}),
    },
    body: JSON.stringify(body),
  });
}

describe("GET /api/wallet-config", () => {
  it("reports both wallets disabled with no configuration", async () => {
    const response = walletConfigGet();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ apple: false, google: false });
  });

  it("reports configured wallets", async () => {
    configureApple();
    configureGoogle();
    const response = walletConfigGet();
    expect(await response.json()).toEqual({ apple: true, google: true });
  });
});

describe("POST /api/apple-pass", () => {
  it("returns 503 when Apple Wallet is not configured", async () => {
    const response = await applePost(
      postRequest("http://localhost:3000/api/apple-pass", VALID_BODY),
    );
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("returns a signed .pkpass with no-store headers when configured", async () => {
    configureApple();
    const response = await applePost(
      postRequest("http://localhost:3000/api/apple-pass", VALID_BODY),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/vnd.apple.pkpass");
    expect(response.headers.get("cache-control")).toBe("no-store");
    const bytes = new Uint8Array(await response.arrayBuffer());
    // ZIP magic "PK\x03\x04"
    expect([...bytes.subarray(0, 4)]).toEqual([0x50, 0x4b, 0x03, 0x04]);
    expect(bytes.length).toBeGreaterThan(1000);
  });

  it("rejects cross-origin browser requests", async () => {
    configureApple();
    const response = await applePost(
      postRequest("http://localhost:3000/api/apple-pass", VALID_BODY, "https://evil.example"),
    );
    expect(response.status).toBe(403);
  });

  it("accepts same-origin browser requests", async () => {
    configureApple();
    const response = await applePost(
      postRequest("http://localhost:3000/api/apple-pass", VALID_BODY, "http://localhost:3000"),
    );
    expect(response.status).toBe(200);
  });

  it("rejects invalid field data", async () => {
    configureApple();
    const response = await applePost(
      postRequest("http://localhost:3000/api/apple-pass", {
        ...VALID_BODY,
        fields: { ...VALID_BODY.fields, email: "nope" },
      }),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid-fields" });
  });

  it("rejects malformed JSON bodies", async () => {
    configureApple();
    const response = await applePost(
      new Request("http://localhost:3000/api/apple-pass", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{not json",
      }),
    );
    expect(response.status).toBe(400);
  });
});

describe("POST /api/google-pass", () => {
  it("returns 503 when Google Wallet is not configured", async () => {
    const response = await googlePost(
      postRequest("http://localhost:3000/api/google-pass", VALID_BODY),
    );
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("returns a save URL with no-store headers when configured", async () => {
    configureGoogle();
    const response = await googlePost(
      postRequest("http://localhost:3000/api/google-pass", VALID_BODY),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const data = (await response.json()) as { saveUrl: string };
    expect(data.saveUrl.startsWith("https://pay.google.com/gp/v/save/")).toBe(true);
  });

  it("rejects photo-bearing oversized bodies via the size limit", async () => {
    configureGoogle();
    const response = await googlePost(
      postRequest("http://localhost:3000/api/google-pass", {
        ...VALID_BODY,
        photoBase64: "A".repeat(64_000),
      }),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid-body" });
  });
});
