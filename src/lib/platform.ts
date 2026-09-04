/** Client-side platform detection for honest feature gating. */

export function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  // iPadOS 13+ reports as Mac; the touch check catches it.
  return /iPhone|iPad|iPod/u.test(ua) || (/Macintosh/u.test(ua) && navigator.maxTouchPoints > 1);
}

export function isAndroid(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android/u.test(navigator.userAgent);
}

/** True when running as an installed app (Home Screen / standalone launch). */
export function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia?.("(display-mode: standalone)").matches === true || nav.standalone === true
  );
}
