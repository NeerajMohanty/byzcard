/**
 * CMS / PKCS#7 detached signature (RFC 5652 SignedData), server-only.
 * Built from Node's crypto plus the local DER encoder — no dependencies.
 *
 * Structure produced (as required by Apple Wallet for the `signature` file):
 *   ContentInfo(signedData) → SignedData v1 → SHA-256 digest →
 *   detached encapContentInfo(data) → certificates(WWDR + signer) →
 *   SignerInfo v1 with signed attributes contentType, signingTime,
 *   messageDigest — RSA PKCS#1 v1.5 signature over the signed attributes.
 */
import { createHash, createPrivateKey, createSign, type KeyObject } from "node:crypto";
import {
  OID,
  derConcat,
  derContextImplicit,
  derInteger,
  derIntegerBytes,
  derNull,
  derOctetString,
  derOid,
  derSequence,
  derSetOf,
  derTlv,
  derUtcTime,
  extractIssuerAndSerial,
} from "./der";

export interface CmsSignInput {
  /** The exact bytes being signed (manifest.json) — detached, not embedded. */
  content: Uint8Array;
  /** Signer (pass type) certificate, DER. */
  signerCertDer: Uint8Array;
  /** Signer private key, PEM (PKCS#1 or PKCS#8). */
  signerKeyPem: string;
  signerKeyPassphrase?: string;
  /** Additional chain certificates (WWDR intermediate), DER. */
  extraCertsDer: readonly Uint8Array[];
  /** Signing time; defaults to now. */
  signingTime?: Date;
}

function loadPrivateKey(pem: string, passphrase?: string): KeyObject {
  return createPrivateKey(
    passphrase !== undefined && passphrase !== "" ? { key: pem, passphrase } : { key: pem },
  );
}

function sha256DigestAlgorithm(): Uint8Array {
  return derSequence(derOid(OID.sha256), derNull());
}

function attribute(oid: string, value: Uint8Array): Uint8Array {
  return derSequence(derOid(oid), derSetOf([value]));
}

/** Build the detached CMS signature bytes. */
export function signDetachedCms(input: CmsSignInput): Uint8Array {
  const digest = createHash("sha256").update(input.content).digest();
  const signingTime = input.signingTime ?? new Date();

  const signedAttrs: Uint8Array[] = [
    attribute(OID.contentType, derOid(OID.pkcs7Data)),
    attribute(OID.signingTime, derUtcTime(signingTime)),
    attribute(OID.messageDigest, derOctetString(Uint8Array.from(digest))),
  ];
  // For the signature, the attributes are encoded as a universal SET OF
  // (0x31); inside SignerInfo they carry the implicit [0] tag instead.
  const attrsSetForSigning = derSetOf(signedAttrs);
  const attrsForSignerInfo = derTlv(
    0xa0,
    attrsSetForSigning.subarray(attrsSetForSigning.length - contentLengthOf(attrsSetForSigning)),
  );

  const key = loadPrivateKey(input.signerKeyPem, input.signerKeyPassphrase);
  const signature = createSign("sha256").update(attrsSetForSigning).sign(key);

  const { issuerDer, serialContent } = extractIssuerAndSerial(input.signerCertDer);
  const signerInfo = derSequence(
    derInteger(1),
    derSequence(Uint8Array.from(issuerDer), derIntegerBytes(Uint8Array.from(serialContent))),
    sha256DigestAlgorithm(),
    attrsForSignerInfo,
    derSequence(derOid(OID.rsaEncryption), derNull()),
    derOctetString(Uint8Array.from(signature)),
  );

  const certificates = derContextImplicit(
    0,
    derConcat([
      ...input.extraCertsDer.map((c) => Uint8Array.from(c)),
      Uint8Array.from(input.signerCertDer),
    ]),
  );

  const signedData = derSequence(
    derInteger(1),
    derSetOf([sha256DigestAlgorithm()]),
    derSequence(derOid(OID.pkcs7Data)), // detached: eContent absent
    certificates,
    derSetOf([signerInfo]),
  );

  return derSequence(derOid(OID.pkcs7SignedData), derTlv(0xa0, signedData));
}

/** Length of a TLV's content portion (helper for re-tagging the SET OF). */
function contentLengthOf(tlv: Uint8Array): number {
  const first = tlv[1];
  if (first === undefined) throw new RangeError("Empty TLV");
  if ((first & 0x80) === 0) return first;
  const numBytes = first & 0x7f;
  let length = 0;
  for (let i = 0; i < numBytes; i++) length = length * 256 + (tlv[2 + i] ?? 0);
  return length;
}
