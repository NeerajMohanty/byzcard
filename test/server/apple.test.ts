import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildPkpass } from "@/server/apple/pass";
import { signDetachedCms } from "@/server/cms";
import { pemToDer, extractIssuerAndSerial } from "@/server/der";
import type { AppleWalletConfig } from "@/server/env";
import { crc32 } from "@/server/crc32";
import { solidPng } from "@/server/png";

const FIXTURES = join(process.cwd(), "test", "fixtures");
const config: AppleWalletConfig = {
  teamId: "TESTTEAMID",
  passTypeId: "pass.test.byzcard",
  certPem: readFileSync(join(FIXTURES, "apple-test-cert.pem"), "utf8"),
  keyPem: readFileSync(join(FIXTURES, "apple-test-key.pem"), "utf8"),
  wwdrPem: readFileSync(join(FIXTURES, "apple-test-wwdr.pem"), "utf8"),
};

const FIELDS = {
  fullName: "Ada Lovelace",
  role: "Chief Analyst",
  company: "Analytical Engines",
  phone: "+1 647 000 0000",
  email: "ada@example.com",
  website: "https://example.com",
};

function opensslAvailable(): boolean {
  try {
    execFileSync("openssl", ["version"], { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

/** Minimal ZIP reader for stored entries (test-only). */
function readZipEntries(zip: Uint8Array): Map<string, Uint8Array> {
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  const entries = new Map<string, Uint8Array>();
  let offset = 0;
  while (offset + 4 <= zip.length && view.getUint32(offset, true) === 0x04034b50) {
    const compressedSize = view.getUint32(offset + 18, true);
    const nameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);
    const name = new TextDecoder().decode(zip.subarray(offset + 30, offset + 30 + nameLength));
    const dataStart = offset + 30 + nameLength + extraLength;
    entries.set(name, zip.subarray(dataStart, dataStart + compressedSize));
    offset = dataStart + compressedSize;
  }
  return entries;
}

function buildTestPass(withPhoto = false): Uint8Array {
  return buildPkpass({
    config,
    fields: FIELDS,
    shareUrl: "https://byzcard.example/s#pTESTPAYLOAD",
    serialNumber: "abcdef0123456789",
    photoPng: withPhoto ? solidPng(4, 10, 20, 30) : undefined,
  });
}

describe("Apple .pkpass builder", () => {
  it("produces a valid ZIP with all required entries", () => {
    const entries = readZipEntries(buildTestPass());
    for (const required of ["pass.json", "icon.png", "icon@2x.png", "manifest.json", "signature"]) {
      expect(entries.has(required), required).toBe(true);
    }
  });

  it("includes thumbnail entries when a photo is provided", () => {
    const entries = readZipEntries(buildTestPass(true));
    expect(entries.has("thumbnail.png")).toBe(true);
    expect(entries.has("thumbnail@2x.png")).toBe(true);
    const manifest = JSON.parse(new TextDecoder().decode(entries.get("manifest.json"))) as Record<
      string,
      string
    >;
    expect(manifest["thumbnail.png"]).toBeDefined();
  });

  it("writes pass.json with the reference layout mapping", () => {
    const entries = readZipEntries(buildTestPass());
    const pass = JSON.parse(new TextDecoder().decode(entries.get("pass.json"))) as Record<
      string,
      unknown
    >;
    expect(pass.formatVersion).toBe(1);
    expect(pass.passTypeIdentifier).toBe("pass.test.byzcard");
    expect(pass.teamIdentifier).toBe("TESTTEAMID");
    expect(pass.serialNumber).toBe("abcdef0123456789");
    const generic = pass.generic as Record<string, { key: string; label: string; value: string }[]>;
    expect(generic.headerFields?.[0]).toEqual({
      key: "company",
      label: "COMPANY",
      value: "Analytical Engines",
    });
    expect(generic.primaryFields?.[0]?.value).toBe("Ada Lovelace");
    expect(generic.primaryFields?.[0]?.label).toBe("CHIEF ANALYST");
    expect(generic.secondaryFields?.map((f) => f.key)).toEqual(["phone", "email"]);
    expect(generic.auxiliaryFields?.[0]?.value).toBe("example.com");
    const barcodes = pass.barcodes as { format: string; message: string }[];
    expect(barcodes[0]?.format).toBe("PKBarcodeFormatQR");
    expect(barcodes[0]?.message).toBe("https://byzcard.example/s#pTESTPAYLOAD");
  });

  it("manifest.json contains correct SHA-1 hashes of every listed file", () => {
    const entries = readZipEntries(buildTestPass());
    const manifest = JSON.parse(new TextDecoder().decode(entries.get("manifest.json"))) as Record<
      string,
      string
    >;
    expect(Object.keys(manifest).sort()).toEqual(
      ["icon.png", "icon@2x.png", "icon@3x.png", "pass.json"].sort(),
    );
    for (const [name, expected] of Object.entries(manifest)) {
      const data = entries.get(name);
      expect(data).toBeDefined();
      const actual = createHash("sha1")
        .update(data ?? new Uint8Array())
        .digest("hex");
      expect(actual, name).toBe(expected);
    }
  });

  it("ZIP CRCs are internally consistent", () => {
    const zip = buildTestPass();
    const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
    let offset = 0;
    let checked = 0;
    while (offset + 4 <= zip.length && view.getUint32(offset, true) === 0x04034b50) {
      const storedCrc = view.getUint32(offset + 14, true);
      const size = view.getUint32(offset + 18, true);
      const nameLength = view.getUint16(offset + 26, true);
      const dataStart = offset + 30 + nameLength;
      expect(crc32(zip.subarray(dataStart, dataStart + size))).toBe(storedCrc);
      offset = dataStart + size;
      checked += 1;
    }
    expect(checked).toBeGreaterThanOrEqual(6);
  });

  it("omits thumbnails entirely when no photo is provided", () => {
    const entries = readZipEntries(buildTestPass(false));
    expect(entries.has("thumbnail.png")).toBe(false);
    expect(entries.has("thumbnail@2x.png")).toBe(false);
  });

  it("icon assets are valid PNG files with correct dimensions", () => {
    const entries = readZipEntries(buildTestPass());
    const pngMagic = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    for (const [name, expectedEdge] of [
      ["icon.png", 29],
      ["icon@2x.png", 58],
      ["icon@3x.png", 87],
    ] as const) {
      const data = entries.get(name);
      expect(data, name).toBeDefined();
      if (data === undefined) continue;
      expect([...data.subarray(0, 8)], `${name} magic`).toEqual(pngMagic);
      // IHDR: width/height are big-endian u32 at offsets 16/20.
      const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
      expect(view.getUint32(16), `${name} width`).toBe(expectedEdge);
      expect(view.getUint32(20), `${name} height`).toBe(expectedEdge);
    }
  });

  it("archive carries a valid end-of-central-directory record", () => {
    const zip = buildTestPass();
    const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
    // EOCD (no comment) is the final 22 bytes.
    const eocd = zip.length - 22;
    expect(view.getUint32(eocd, true)).toBe(0x06054b50);
    const entryCount = view.getUint16(eocd + 10, true);
    expect(entryCount).toBe(6); // pass.json, 3 icons, manifest, signature
  });

  it("pass.json carries required metadata and barcode encoding", () => {
    const entries = readZipEntries(buildTestPass());
    const pass = JSON.parse(new TextDecoder().decode(entries.get("pass.json"))) as Record<
      string,
      unknown
    >;
    expect(pass.organizationName).toBe("Byzcard");
    expect(typeof pass.description).toBe("string");
    expect((pass.description as string).length).toBeGreaterThan(0);
    const barcodes = pass.barcodes as { messageEncoding: string; altText?: string }[];
    expect(barcodes[0]?.messageEncoding).toBe("iso-8859-1");
  });

  it("CMS output is deterministic for a fixed signing time", () => {
    const content = new TextEncoder().encode('{"test":"manifest"}');
    const [certDer] = pemToDer(config.certPem, "CERTIFICATE");
    if (certDer === undefined) throw new Error("fixture cert unreadable");
    const at = new Date("2026-01-02T03:04:05Z");
    const a = signDetachedCms({
      content,
      signerCertDer: certDer,
      signerKeyPem: config.keyPem,
      extraCertsDer: [],
      signingTime: at,
    });
    const b = signDetachedCms({
      content,
      signerCertDer: certDer,
      signerKeyPem: config.keyPem,
      extraCertsDer: [],
      signingTime: at,
    });
    expect(Buffer.from(a).equals(Buffer.from(b))).toBe(true);
    // Sane container: starts with SEQUENCE, contains the signedData OID.
    expect(a[0]).toBe(0x30);
    const oidSignedData = Buffer.from([0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x07, 0x02]);
    expect(Buffer.from(a).includes(oidSignedData)).toBe(true);
  });

  it("extracts issuer and serial from the fixture certificate", () => {
    const [certDer] = pemToDer(config.certPem, "CERTIFICATE");
    if (certDer === undefined) throw new Error("fixture cert unreadable");
    const { issuerDer, serialContent } = extractIssuerAndSerial(certDer);
    expect(issuerDer[0]).toBe(0x30); // Name SEQUENCE
    expect(serialContent.length).toBeGreaterThan(0);
    // Issuer of a self-signed cert contains its own CN string.
    const issuerText = new TextDecoder("utf-8", { fatal: false }).decode(issuerDer);
    expect(issuerText).toContain("BYZCARD TEST");
  });

  it.skipIf(!opensslAvailable())(
    "signature verifies as detached CMS/PKCS#7 under OpenSSL (independent check)",
    () => {
      const entries = readZipEntries(buildTestPass());
      const dir = mkdtempSync(join(tmpdir(), "byzcard-cms-"));
      try {
        const sigPath = join(dir, "signature.der");
        const manifestPath = join(dir, "manifest.json");
        const outPath = join(dir, "out.json");
        writeFileSync(sigPath, entries.get("signature") ?? new Uint8Array());
        writeFileSync(manifestPath, entries.get("manifest.json") ?? new Uint8Array());
        // -noverify skips the CA chain (fixtures are self-signed); the
        // digest and RSA signature math are still fully verified.
        execFileSync(
          "openssl",
          [
            "smime",
            "-verify",
            "-inform",
            "DER",
            "-in",
            sigPath,
            "-content",
            manifestPath,
            "-noverify",
            "-out",
            outPath,
          ],
          { stdio: "pipe" },
        );
        const verified = readFileSync(outPath, "utf8");
        expect(verified).toContain('"pass.json"');
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    },
  );
});
