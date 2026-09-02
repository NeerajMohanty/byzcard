/**
 * Web Share API integration with a download fallback.
 * Sharing sends data only where the user explicitly points it (OS sheet).
 */

export function canShareFiles(files: File[]): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files })
  );
}

export function canShareText(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

export type ShareOutcome = "shared" | "downloaded" | "cancelled" | "failed";

/** Share a file via the OS sheet, falling back to a local download. */
export async function shareOrDownloadFile(file: File, title: string): Promise<ShareOutcome> {
  if (canShareFiles([file])) {
    try {
      await navigator.share({ files: [file], title });
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
      // Fall through to download.
    }
  }
  downloadBlob(file, file.name);
  return "downloaded";
}

/** Share a URL via the OS sheet; returns false when unsupported. */
export async function shareUrl(url: string, title: string): Promise<ShareOutcome> {
  if (!canShareText()) return "failed";
  try {
    await navigator.share({ url, title });
    return "shared";
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
    return "failed";
  }
}

/** Trigger a local file download from a Blob (no network involved). */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Give the browser a moment to start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Copy text to the clipboard; returns success. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
