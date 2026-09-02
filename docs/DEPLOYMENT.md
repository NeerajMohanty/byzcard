# Deployment requirements

BYZCARD has no deployment provider configured in this repository, and none
is required by the code — any host that runs a Next.js server works, with
no lock-in. Before a **production** deployment with Wallet enabled, the
items below are mandatory.

## 1. Edge rate limiting for the Wallet endpoints (REQUIRED)

`/api/apple-pass` and `/api/google-pass` are intentionally
unauthenticated (BYZCARD has no accounts) and perform cryptographic work
per request. Application-level protections exist (origin allow-listing,
strict Content-Type, body-size caps, schema validation before any signing)
— but **they are not a rate limiter**, and a stateless serverless process
cannot implement a real one without external state, which the zero-storage
architecture forbids inside the app.

Therefore rate limiting MUST be configured at the hosting edge:

| Platform   | Mechanism (examples)                                                                         |
| ---------- | -------------------------------------------------------------------------------------------- |
| Vercel     | Vercel WAF custom rule: rate-limit `POST /api/apple-pass` and `POST /api/google-pass` per IP |
| Cloudflare | Rate Limiting Rule scoped to `/api/*` POST requests                                          |
| nginx      | `limit_req_zone`/`limit_req` on `location /api/`                                             |

A starting point: ~10 requests/minute/IP for each Wallet endpoint (normal
users need 1–2 per session). Do **not** rate-limit `/`, `/s`, `/create`,
`/card`, or static assets — recipient links and local card use must never
be throttled.

**Production Wallet deployment is incomplete until this is configured.**
The core app (without Wallet) has no such gate.

## 2. HTTPS canonical origin

Set `NEXT_PUBLIC_APP_URL` to the exact public origin. It drives share
URLs, QR/NFC payloads, the Wallet pass QR, and the Google Wallet JWT
`origins` claim (Google rejects saves from other origins). Web NFC and
the clipboard/share APIs also require a secure context.

## 3. Secrets

Wallet credentials only via environment variables / platform secret
stores (`docs/WALLET_SETUP.md`). Never in the repository or client bundle.

## 4. Logging discipline

Configure the platform so request **bodies** of `/api/*` are not captured
in access logs. The application never logs them; the platform must not
either, or the zero-storage privacy claim breaks at the infrastructure
layer.

## 5. One-time Google class setup

Run `npm run wallet:google:setup` once per issuer before enabling Google
Wallet (see `docs/WALLET_SETUP.md`).
