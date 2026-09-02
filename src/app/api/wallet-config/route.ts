import { appleWalletConfig, googleWalletConfig } from "@/server/env";
import { noStoreJson } from "@/server/http";

export const dynamic = "force-dynamic";

/** Reports only which Wallet integrations are configured — never secrets. */
export function GET(): Response {
  return noStoreJson({
    apple: appleWalletConfig() !== null,
    google: googleWalletConfig() !== null,
  });
}
