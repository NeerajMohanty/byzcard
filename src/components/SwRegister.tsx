"use client";

import { useEffect } from "react";

/**
 * Registers the offline service worker. Registration happens for plain
 * browser tabs — installation as a PWA is never required for offline use.
 * Skipped in development where it would interfere with hot reload.
 */
export function SwRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Offline support is progressive enhancement; the app works without it.
    });
  }, []);
  return null;
}
