# Wallet credential setup

Both integrations are optional. Without credentials the buttons are hidden
and every other feature works. Never commit credentials; supply them as
environment variables (inline PEM with `\n` escapes, or `*_FILE` paths).

## Apple Wallet

Requirements (all from Apple; BYZCARD cannot remove any of them):

1. **Apple Developer Program** membership (paid, currently US$99/year).
2. Register a **Pass Type ID** (e.g. `pass.com.yourdomain.byzcard`) in
   Certificates, Identifiers & Profiles.
3. Create the **Pass Type ID certificate** for it; export the certificate
   and private key as PEM.
4. Download the **WWDR intermediate certificate** (G4 or the current one)
   from Apple's certificate authority page and convert to PEM.

Set:

```
APPLE_TEAM_ID=ABCDE12345
APPLE_PASS_TYPE_ID=pass.com.yourdomain.byzcard
APPLE_PASS_CERT_PEM_FILE=/secrets/pass-cert.pem
APPLE_PASS_KEY_PEM_FILE=/secrets/pass-key.pem
APPLE_PASS_KEY_PASSPHRASE=...        # if the key is encrypted
APPLE_WWDR_CERT_PEM_FILE=/secrets/wwdr.pem
```

Notes:

- Pass certificates expire (~annually). Renew and redeploy; passes already
  in users' Wallets keep working.
- Signing is implemented in-repo (`src/server/der.ts`, `src/server/cms.ts`)
  with `node:crypto` — SHA-256 CMS with signed attributes, WWDR embedded,
  detached over `manifest.json` (SHA-1 entries per Apple's spec). Verified
  against OpenSSL in the test suite. **Real-device validation with a
  production certificate is the final gate you must run once credentials
  exist.**

## Google Wallet

1. Create a **Google Wallet issuer account** in the Google Pay & Wallet
   Console (free; new accounts start in Demo Mode until Google approves
   publishing access — passes still work for test users in Demo Mode).
2. Create a **GCP service account**, grant it access in the Wallet
   Console, enable the Google Wallet API, and download its key; extract
   the private key PEM and client email.
3. Set the environment variables below, then run the **one-time class
   setup**:

   ```sh
   npm run wallet:google:setup
   ```

   This creates the `{issuerId}.byzcard_v1` GenericClass (Google's
   production pattern: class once, objects per save). It is idempotent —
   an already existing matching class is success — and prints no secrets.
   Re-run it any time; it stores nothing.

Set:

```
GOOGLE_WALLET_ISSUER_ID=3388000000000000000
GOOGLE_WALLET_SA_EMAIL=byzcard@your-project.iam.gserviceaccount.com
GOOGLE_WALLET_SA_KEY_PEM_FILE=/secrets/google-sa-key.pem
```

Notes:

- User issuance is stateless: each save JWT carries only the
  GenericObject referencing the pre-created class. No REST calls during
  normal use, no state.
- `NEXT_PUBLIC_APP_URL` must be the exact origin serving BYZCARD — it is
  placed in the JWT `origins` claim and Google rejects saves from other
  origins.
- The pass carries no photo by design (Google requires hosted image URLs,
  which the zero-storage architecture forbids).

## Apple real-device validation checklist (final production gate)

The signer's cryptographic structure is verified against OpenSSL in the
test suite, but Apple Wallet is **not production-verified** until a pass
signed with an Apple-issued certificate is accepted on a physical iPhone.
When credentials exist, run through:

1. Apple Developer membership active.
2. Pass Type ID registered.
3. Pass Type certificate issued for that ID.
4. Private key exported alongside it.
5. Current WWDR intermediate certificate downloaded.
6. Production environment variables set (see above).
7. App served from the HTTPS production origin (`NEXT_PUBLIC_APP_URL`).
8. Create a real card on the iPhone (with photo).
9. Tap **Add to Apple Wallet** — the pass preview must open and add.
10. Verify the visual layout: company top right, role + name left, photo
    thumbnail right, phone/email, QR.
11. Scan the pass QR with a second phone — the recipient card must open.
12. Edit the local card (change the role).
13. Tap **Update Apple Wallet pass**.
14. Verify Wallet replaced the pass in place (same serial) with the new
    content.

## Rotation and custody

- Keep PEMs out of the repository and out of client bundles (they are read
  only in `src/server/env.ts`, which throws if it ever reaches a browser).
- Rotate the Google service-account key on your normal schedule; renew the
  Apple certificate before expiry.
- The files in `test/fixtures/` are self-signed test doubles and are
  intentionally committed.
