import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createPublicKey, createVerify } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildGoogleSaveUrl } from "@/server/google/jwt";
import type { GoogleWalletConfig } from "@/server/env";

const keyPem = readFileSync(join(process.cwd(), "test", "fixtures", "google-test-key.pem"), "utf8");
const config: GoogleWalletConfig = {
  issuerId: "3388000000000000000",
  saEmail: "test@byzcard-test.iam.gserviceaccount.com",
  keyPem,
};

const FIELDS = {
  fullName: "Ada Lovelace",
  role: "Chief Analyst",
  company: "Analytical Engines",
  phone: "+1 647 000 0000",
  email: "ada@example.com",
  website: "https://example.com",
  linkedin: "https://www.linkedin.com/in/ada",
};

function b64urlToJson(part: string): Record<string, unknown> {
  const pad = "=".repeat((4 - (part.length % 4)) % 4);
  const json = Buffer.from(part.replace(/-/gu, "+").replace(/_/gu, "/") + pad, "base64").toString();
  return JSON.parse(json) as Record<string, unknown>;
}

function buildUrl(): string {
  return buildGoogleSaveUrl({
    config,
    fields: FIELDS,
    shareUrl: "https://byzcard.example/s#pTESTPAYLOAD",
    objectSuffix: "abcdef0123456789",
    appOrigin: "https://byzcard.example",
  });
}

describe("Google Wallet save JWT", () => {
  it("produces a pay.google.com save URL with a three-part JWT", () => {
    const url = buildUrl();
    expect(url.startsWith("https://pay.google.com/gp/v/save/")).toBe(true);
    const jwt = url.slice("https://pay.google.com/gp/v/save/".length);
    expect(jwt.split(".")).toHaveLength(3);
  });

  it("JWT header and payload carry the savetowallet contract", () => {
    const jwt = buildUrl().slice("https://pay.google.com/gp/v/save/".length);
    const [headerPart = "", payloadPart = ""] = jwt.split(".");
    expect(b64urlToJson(headerPart)).toEqual({ alg: "RS256", typ: "JWT" });
    const payload = b64urlToJson(payloadPart);
    expect(payload.iss).toBe(config.saEmail);
    expect(payload.aud).toBe("google");
    expect(payload.typ).toBe("savetowallet");
    expect(payload.origins).toEqual(["https://byzcard.example"]);
  });

  it("carries only a GenericObject referencing the pre-created class (production lifecycle)", () => {
    const jwt = buildUrl().slice("https://pay.google.com/gp/v/save/".length);
    const payload = b64urlToJson(jwt.split(".")[1] ?? "");
    const inner = payload.payload as {
      genericClasses?: unknown;
      genericObjects: Record<string, unknown>[];
    };
    // The class is created once by the operator setup tool — never per save.
    expect(inner.genericClasses).toBeUndefined();
    expect(inner.genericObjects).toHaveLength(1);
    const obj = inner.genericObjects[0] ?? {};
    expect(obj.state).toBe("ACTIVE");
    const cardTitle = obj.cardTitle as { defaultValue: { value: string } };
    const header = obj.header as { defaultValue: { value: string } };
    const subheader = obj.subheader as { defaultValue: { value: string } };
    expect(cardTitle.defaultValue.value).toBe("Byzcard");
    expect(header.defaultValue.value).toBe("Ada Lovelace");
    expect(subheader.defaultValue.value).toBe("Chief Analyst");
    expect(obj.id).toBe("3388000000000000000.abcdef0123456789");
    expect(obj.classId).toBe("3388000000000000000.byzcard_v1");
    const barcode = obj.barcode as { type: string; value: string };
    expect(barcode.type).toBe("QR_CODE");
    expect(barcode.value).toBe("https://byzcard.example/s#pTESTPAYLOAD");
    const text = obj.textModulesData as { id: string; body: string }[];
    expect(text.map((t) => t.id)).toEqual(["company", "phone", "email", "website"]);
    const links = obj.linksModuleData as { uris: { id: string }[] };
    expect(links.uris.map((u) => u.id)).toEqual(["website", "linkedin"]);
    // Zero-storage rule: no image fields of any kind.
    expect(JSON.stringify(obj)).not.toContain("sourceUri");
    expect(obj.logo).toBeUndefined();
    expect(obj.heroImage).toBeUndefined();
  });

  it("signature verifies with the fixture key's public half (RS256)", () => {
    const jwt = buildUrl().slice("https://pay.google.com/gp/v/save/".length);
    const [headerPart = "", payloadPart = "", sigPart = ""] = jwt.split(".");
    const pad = "=".repeat((4 - (sigPart.length % 4)) % 4);
    const signature = Buffer.from(sigPart.replace(/-/gu, "+").replace(/_/gu, "/") + pad, "base64");
    const publicKey = createPublicKey(keyPem);
    const ok = createVerify("RSA-SHA256")
      .update(`${headerPart}.${payloadPart}`)
      .verify(publicKey, signature);
    expect(ok).toBe(true);
  });

  it("omits optional link entries when fields are absent", () => {
    const url = buildGoogleSaveUrl({
      config,
      fields: { ...FIELDS, website: undefined, linkedin: undefined },
      shareUrl: "https://byzcard.example/s#pX",
      objectSuffix: "abcdef0123456789",
      appOrigin: "https://byzcard.example",
    });
    const payload = b64urlToJson(
      url.slice("https://pay.google.com/gp/v/save/".length).split(".")[1] ?? "",
    );
    const obj =
      (payload.payload as { genericObjects: Record<string, unknown>[] }).genericObjects[0] ?? {};
    expect(obj.linksModuleData).toBeUndefined();
    const text = obj.textModulesData as { id: string }[];
    expect(text.map((t) => t.id)).toEqual(["company", "phone", "email"]);
  });
});
