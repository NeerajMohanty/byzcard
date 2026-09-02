# BYZCARD architecture

## Zero-storage model

The user's card is owned by their browser. There is no user database, card
database, profile API, authentication, analytics, or cloud storage of any
kind. The server side consists of static/prerendered pages plus two
stateless signing endpoints that exist only because Apple and Google
require issuer-held private keys for Wallet passes.

```
                     MOBILE BROWSER
 ┌────────────────────────────────────────────────────┐
 │ core (pure TS): card model · validation ·          │
 │ SharePayloadV1 codec · QR encoder · vCard · NDEF · │
 │ backup schema                                      │
 │                                                    │
 │ IndexedDB ◄── photo (Canvas-resized JPEG bytes)    │
 │ service worker + Cache API (offline, no install)   │
 └────────┬──────────────┬──────────────┬─────────────┘
          ▼              ▼              ▼
     QR display     Web Share      Web NFC write
     (share + vCard) (.vcf, URL,   (Android Chrome
      QR)            backup)        only)
          │
          │ explicit user action only
          ▼
 ┌──────────────────────────────────────────┐
 │ stateless signing endpoints (optional)   │
 │ POST /api/apple-pass  → signed .pkpass   │
 │ POST /api/google-pass → signed save URL  │
 │ in-memory only · no persistence · no     │
 │ card logging · Cache-Control: no-store   │
 └──────────────────────────────────────────┘
```

## Module boundaries

```
src/core/       Pure TypeScript. No React, DOM, IndexedDB, or Wallet
                imports. Deterministic and fully unit-tested.
  card/         Card type, limits, validation, normalization
  share/        SharePayloadV1 codec, bytes (base64url/deflate), URL budget
  qr/           Byte-mode QR encoder, versions 1–40, masks + penalties
  vcard/        vCard 3.0 builder (escaping, folding, embedded photo)
  ndef/         NDEF URI record bytes + NTAG budget checks
  backup/       .byzcard schema + defensive parser/migrator
src/adapters/   Real I/O boundaries: idb/, photo/ (Canvas), share/
                (Web Share), nfc/ (Web NFC), wallet/ (endpoint client)
src/features/   Screen-level React: editor/, card/, recipient/
src/components/ Shared presentational pieces (CardView is the single
                card renderer used by preview, card screen, and landing)
src/server/     Server-only: env (credential access + runtime guard),
                der/cms (hand-rolled PKCS#7), zip, png, crc32,
                apple/pass, google/jwt, http, walletRequest
src/app/        Next.js routes; api/* are the only dynamic endpoints
```

QR, vCard, NDEF, share, and backup encoding are pure functions, not
"adapters" — only true side-effect boundaries get adapter modules.

## SharePayloadV1

Versioned, self-contained wire format used identically by the on-card QR,
the Wallet pass QR, and NFC tags:

```
fragment = <flag><base64url(bytes)>
  flag "d": deflate-raw-compressed JSON   flag "p": plain JSON
  JSON: [1, fullName, role, company, phone, email, website?, linkedin?]
URL = {origin}/s#{fragment}
```

- UTF-8 throughout → Unicode names, international numbers/domains survive.
- Compression via native `CompressionStream("deflate-raw")` with a plain
  fallback; the smaller encoding wins.
- Budgets: soft 400 bytes (ideal scanning), hard 700 bytes (encode refused,
  editor tells the user which fields to shorten).
- **No photo, ever** — byte math forbids it in QR/NFC.
- The decoder validates version, structure, and every field; unknown
  versions produce a typed error the viewer explains honestly.

## Recipient flow (`/s`)

A static page. The HTTP request is for `/s` only — the fragment stays in
the browser (RFC 3986; verified in E2E by recording all requests). The
page decodes and validates locally, renders an initials avatar (no photo
fetch — there is nowhere to fetch from), and offers Save Contact / Call /
Email / links. No `/api/card`, no `/profile/{id}`, no lookups.

## Photo pipeline

select → MIME/size validation (JPEG/PNG/WebP, ≤10 MB) → `createImageBitmap`
(element fallback) → center-crop square → 512 px Canvas → JPEG 0.85 →
bytes stored in IndexedDB (ArrayBuffer + metadata; more clone-portable
than Blob). The photo appears in: the local card, the vCard file
(`PHOTO;ENCODING=b`), the backup, and the Apple pass thumbnail (re-encoded
locally to 270 px PNG at request time, since Apple pass images must be
PNG). It never appears in QR, NFC, or Google Wallet.

## Local storage

IndexedDB (`byzcard` db, single `kv` store, schema v1 with an upgrade
switch as the migration path). Stored keys: `card`, `photoBytes`,
`photoMeta`, `walletIds`. `navigator.storage.persist()` is requested
best-effort after saves. Corrupted values are detected by type guards and
treated as absent. Because browsers can evict storage, **export/import is
a core feature**: `firstname-lastname.byzcard` is versioned JSON (schema,
card, base64 photo, wallet ids, timestamps), generated and parsed entirely
on-device, validated defensively, and never executed.

## Offline

`public/sw.js` (plain JS, registered in production): navigations are
network-first with cache fallback; `/_next/static` is cache-first;
`/api/*` is never cached. Combined with IndexedDB this gives the full
core workflow offline after one load — **PWA installation is not
required** (install and offline are independent concepts). Wallet
issuance requires connectivity and says so.

## Apple Wallet

`POST /api/apple-pass`: validate (strict schema, size caps, PNG magic) →
re-derive the share URL server-side from the validated fields (the pass QR
can never contain attacker-chosen content) → build `pass.json` (generic
pass mapped to the reference layout: company in `headerFields` top-right,
role-labeled name in `primaryFields`, phone/email secondary, website
auxiliary, QR barcode) → generate icon PNGs in code → `manifest.json`
(SHA-1) → **detached CMS/PKCS#7 signature** → stored-entry ZIP → return
`application/vnd.apple.pkpass` with `Cache-Control: no-store` → discard.

The CMS signature is produced by `src/server/der.ts` + `src/server/cms.ts`
(hand-rolled DER + `node:crypto` RSA, SHA-256 signed attributes including
`signingTime`), so **no cryptographic dependency exists**. It is verified
in tests against OpenSSL (`smime -verify`).

Pass updates: the serial number is generated client-side once and stored
locally; regenerating with the same serial + pass type id makes Wallet
replace the pass ("Update Apple Wallet pass"). No push updates, no
registration web service — those would require server state.

## Google Wallet

Class lifecycle follows Google's production pattern: the BYZCARD
GenericClass (`{issuerId}.byzcard_v1`) is created **once** by the operator
via `npm run wallet:google:setup` (a self-contained Node tool — service
account JWT-bearer auth + the Wallet REST API, no SDK; idempotent, treats
an existing matching class as success). Normal issuance then makes zero
Google API calls:

`POST /api/google-pass`: validate → build a save JWT containing **only a
GenericObject** (title, name, role, text modules, links, QR barcode)
referencing the pre-created `classId` → RS256-sign with the
service-account key via `node:crypto` → return
`https://pay.google.com/gp/v/save/<jwt>` → discard. No class is ever
(re)created per user, and BYZCARD keeps zero state.

**No photo on the Google pass**: Google Wallet images must be fetched by
Google from hosted HTTPS URLs (data URIs unsupported; "secure private
images" still require uploading to Google and only surface in image
modules). Hosting images would violate the zero-storage architecture, so
the Google pass ships text + QR only. This is a deliberate, documented
limitation, not a bug.

## NFC

- Payload: an NDEF URI record of the same share URL, built locally
  (`src/core/ndef`), with live size display against real budgets
  (NTAG215 ≈ 492 B, NTAG216 ≈ 868 B usable; NTAG213 is not targeted).
- **Android Chrome/Edge/Samsung**: Web NFC (`NDEFReader`) writes tags —
  HTTPS + foreground + user gesture required; feature-detected, typed via
  a local ambient declaration (no `any`).
- **iPhone**: no browser exposes NFC writing; the UI says exactly that and
  the rest of the product is unaffected. iPhones _read_ BYZCARD tags fine
  (background tag reading).
- **No phone-to-phone NFC** — not possible from the web on any platform;
  BYZCARD does not claim otherwise. Web Share/AirDrop of the link is the
  honest equivalent.

## Security

- Every boundary validates: card inputs (lengths, email/phone/URL formats,
  `javascript:`/`data:` rejected), share payloads, backup files (size cap,
  schema, base64, photo bounds), Wallet requests (body ≤1.2 MB Apple /
  32 KB Google, PNG magic, photo ≤800 KB, hex serial format).
- No `dangerouslySetInnerHTML`; React escaping everywhere.
- Wallet endpoints: `Cache-Control: no-store`, `X-Content-Type-Options`,
  Origin allow-listing (same-origin or absent), no card logging, no
  persistence.
- Abuse control is deliberately stateless: size limits + origin checks +
  strict validation. **Residual risk**: the endpoints are publicly
  callable and could be hammered to burn CPU; platform-level rate limiting
  (Vercel/Cloudflare/nginx) is the intended mitigation. A database or
  Redis for rate limiting is out of scope by design.

## Browser compatibility floor

Safari 16.4+/Chrome 80+ (both several years old) for `CompressionStream`;
the codec falls back to uncompressed when absent, and the recipient viewer
explains itself on browsers too old to decompress. Web Share files: iOS
15+/modern Android. Web NFC: Chrome-family on Android only.

## Open-source readiness

All source, including both Wallet signers, is publishable. Secrets enter
only via environment variables; the repo's PEM files are self-signed test
fixtures (see `test/fixtures/README.md`). A self-hoster without any Apple
or Google credentials gets the complete core; Wallet buttons hide
themselves via `/api/wallet-config`. A fork operator wanting Wallet needs
their own Apple Developer membership and Google issuer approval.
