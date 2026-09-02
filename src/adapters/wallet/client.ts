/**
 * Client for the stateless Wallet signing endpoints.
 * Card data leaves the device ONLY through these calls, and only when the
 * user explicitly taps a Wallet action.
 */
import type { CardFields } from "@/core/card/types";
import { bytesToBase64 } from "@/core/share/bytes";

export interface WalletAvailability {
  apple: boolean;
  google: boolean;
}

/** "offline" when the availability check itself could not reach the server. */
export async function fetchWalletAvailability(
  signal?: AbortSignal,
): Promise<WalletAvailability | "offline"> {
  try {
    const response = await fetch("/api/wallet-config", { cache: "no-store", signal });
    if (!response.ok) return { apple: false, google: false };
    const data: unknown = await response.json();
    if (typeof data !== "object" || data === null) return { apple: false, google: false };
    const record = data as Record<string, unknown>;
    return { apple: record.apple === true, google: record.google === true };
  } catch {
    return "offline";
  }
}

export type WalletRequestOutcome =
  { ok: true } | { ok: false; reason: "offline" | "rejected" | "failed" };

/** Request a signed .pkpass and hand it to the OS (download/open). */
export async function requestApplePass(
  fields: CardFields,
  serialNumber: string,
  photoPngBlob: Blob | null,
): Promise<WalletRequestOutcome> {
  let photoBase64: string | undefined;
  if (photoPngBlob !== null) {
    photoBase64 = bytesToBase64(new Uint8Array(await photoPngBlob.arrayBuffer()));
  }
  let response: Response;
  try {
    response = await fetch("/api/apple-pass", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields, serialNumber, photoBase64 }),
    });
  } catch {
    return { ok: false, reason: "offline" };
  }
  if (!response.ok) return { ok: false, reason: "rejected" };
  const blob = await response.blob();
  const url = URL.createObjectURL(new Blob([blob], { type: "application/vnd.apple.pkpass" }));
  // Navigation (not download attr) lets iOS Safari open the pass preview.
  window.location.href = url;
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return { ok: true };
}

/** Request a signed Google Wallet save URL and navigate to it. */
export async function requestGooglePass(
  fields: CardFields,
  serialNumber: string,
): Promise<WalletRequestOutcome> {
  let response: Response;
  try {
    response = await fetch("/api/google-pass", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields, serialNumber }),
    });
  } catch {
    return { ok: false, reason: "offline" };
  }
  if (!response.ok) return { ok: false, reason: "rejected" };
  const data: unknown = await response.json();
  const saveUrl =
    typeof data === "object" && data !== null
      ? (data as Record<string, unknown>).saveUrl
      : undefined;
  if (typeof saveUrl !== "string" || !saveUrl.startsWith("https://pay.google.com/")) {
    return { ok: false, reason: "failed" };
  }
  window.location.href = saveUrl;
  return { ok: true };
}
