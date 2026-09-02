# BYZCARD

A mobile-first digital business card that lives on your phone.

- Card creation, editing, photo processing, QR generation, vCard generation,
  NFC payload generation, backup export/import, and offline use all happen
  **in the browser, on the device**.
- BYZCARD has **no accounts, no database, and no server-side card storage**.
- The only server functionality is a pair of **stateless Wallet signing
  endpoints** (Apple / Google), which process a request in memory and retain
  nothing. Both are optional — without credentials the whole core still works.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full technical
design, [docs/WALLET_SETUP.md](docs/WALLET_SETUP.md) for Wallet credential
setup, and [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for the production
deployment requirements (edge rate limiting for the Wallet endpoints is a
hard gate).

## Quick start

```sh
npm ci
cp .env.example .env.local   # optional; defaults work for development
npm run dev                  # http://localhost:3000
```

## Scripts

| Script                        | Purpose                                                        |
| ----------------------------- | -------------------------------------------------------------- |
| `npm run dev`                 | Development server                                             |
| `npm run build`               | Production build                                               |
| `npm run start`               | Serve the production build                                     |
| `npm run format`              | Prettier write                                                 |
| `npm run format:check`        | Prettier check                                                 |
| `npm run lint`                | ESLint (zero-`any`, 400-line file cap enforced)                |
| `npm run typecheck`           | `tsc --noEmit` (strict)                                        |
| `npm run test`                | Vitest unit + integration suite                                |
| `npm run test:e2e`            | Playwright browser suite (3 viewports, offline, clean console) |
| `npm run wallet:google:setup` | One-time Google Wallet class setup (see docs/WALLET_SETUP.md)  |
| `npm run verify`              | format:check → lint → typecheck → test → build                 |

## Environment

Everything is optional in development. See [.env.example](.env.example).

| Variable                              | Purpose                                |
| ------------------------------------- | -------------------------------------- |
| `NEXT_PUBLIC_APP_URL`                 | Canonical origin for share/QR/NFC URLs |
| `APPLE_TEAM_ID`, `APPLE_PASS_TYPE_ID` | Apple Wallet identifiers               |
| `APPLE_PASS_CERT_PEM[_FILE]`          | Pass Type ID certificate (PEM)         |
| `APPLE_PASS_KEY_PEM[_FILE]`           | Its private key (PEM)                  |
| `APPLE_PASS_KEY_PASSPHRASE`           | Key passphrase, if any                 |
| `APPLE_WWDR_CERT_PEM[_FILE]`          | Apple WWDR intermediate certificate    |
| `GOOGLE_WALLET_ISSUER_ID`             | Google Wallet issuer id                |
| `GOOGLE_WALLET_SA_EMAIL`              | GCP service account email              |
| `GOOGLE_WALLET_SA_KEY_PEM[_FILE]`     | Service account private key (PEM)      |

Credentials are read **server-side only** and are never bundled for the
browser. When absent, the corresponding Wallet button is hidden and
everything else works.

## Privacy

> Your card is created and stored locally on your device. BYZCARD has no
> accounts and no card database, and does not store your card, photo, or
> contact information. Information is transmitted only when you explicitly
> use a sharing or Wallet feature. Wallet signing processes the required
> information in memory and does not retain it.

The share QR encodes the card into the URL **fragment** (`/s#…`), which
browsers never transmit to the server — verified in the E2E suite by
recording every network request during a recipient visit.

## Dependencies

Runtime: `next`, `react`, `react-dom`. **Nothing else.** QR encoding,
vCard, NDEF, compression, IndexedDB access, ZIP, PNG, and even the CMS
(PKCS#7) signature for Apple Wallet are implemented in-repo on top of
platform APIs and `node:crypto`. Dev-only dependencies (test tooling,
`jsqr` as an independent QR decode verifier, Playwright) never ship.
