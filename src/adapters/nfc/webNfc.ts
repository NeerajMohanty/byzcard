/**
 * Web NFC adapter (Chrome on Android only).
 * Writing requires HTTPS, a foreground page, and an explicit user action.
 * iPhone: no browser exposes NFC writing — the UI states this honestly.
 */

export function webNfcSupported(): boolean {
  return typeof window !== "undefined" && "NDEFReader" in window;
}

export type NfcWriteOutcome =
  "written" | "unsupported" | "permission-denied" | "failed" | "aborted";

/**
 * Write the share URL as an NDEF URI record. Resolves when a tag is tapped
 * and written, or when the timeout elapses.
 */
export async function writeNfcUrl(url: string, timeoutMs = 30_000): Promise<NfcWriteOutcome> {
  if (!webNfcSupported()) return "unsupported";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const reader = new NDEFReader();
    await reader.write(
      { records: [{ recordType: "url", data: url }] },
      { overwrite: true, signal: controller.signal },
    );
    return "written";
  } catch (error) {
    if (error instanceof DOMException) {
      if (error.name === "AbortError") return "aborted";
      if (error.name === "NotAllowedError") return "permission-denied";
    }
    return "failed";
  } finally {
    clearTimeout(timer);
  }
}
