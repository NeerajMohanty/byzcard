"use client";

import { useEffect, useState } from "react";
import { isIos } from "./platform";
import { useClientValue } from "./useClientValue";

/**
 * Narrow local typing for the Chromium install-prompt event — the DOM lib
 * does not ship it. Runtime feature detection remains mandatory.
 * https://wicg.github.io/manifest-incubations/#beforeinstallpromptevent-interface
 */
export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isBeforeInstallPrompt(event: Event): event is BeforeInstallPromptEvent {
  return "prompt" in event && "userChoice" in event;
}

/** Standalone/installed detection (Chromium display-mode + iOS Safari). */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  if (typeof window.matchMedia === "function") {
    try {
      if (window.matchMedia("(display-mode: standalone)").matches) return true;
    } catch {
      // matchMedia unavailable/broken — fall through to the iOS check.
    }
  }
  const nav: Navigator & { standalone?: boolean } = navigator;
  return nav.standalone === true;
}

export type InstallMode =
  | "installed"
  /** Chromium captured beforeinstallprompt — native prompt available. */
  | "native"
  /** iOS Safari — manual Share → Add to Home Screen instructions. */
  | "ios"
  /** Everything else — generic browser-menu instructions. */
  | "manual";

export interface InstallPromptState {
  mode: InstallMode;
  /** Trigger the native prompt; resolves with the user's choice. */
  promptInstall: () => Promise<"accepted" | "dismissed" | "unavailable">;
}

/** Capture and manage the Home Screen install lifecycle. */
export function useInstallPrompt(): InstallPromptState {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installedByEvent, setInstalledByEvent] = useState(false);
  const standalone = useClientValue(isStandalone, false);
  const ios = useClientValue(isIos, false);

  useEffect(() => {
    // Pure external-event subscription; state changes only in callbacks.
    const onBeforeInstall = (event: Event): void => {
      if (!isBeforeInstallPrompt(event)) return;
      event.preventDefault(); // keep it for our own CTA
      setDeferred(event);
    };
    const onInstalled = (): void => {
      setInstalledByEvent(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const installed = standalone || installedByEvent;

  const promptInstall = async (): Promise<"accepted" | "dismissed" | "unavailable"> => {
    if (deferred === null) return "unavailable";
    await deferred.prompt();
    const choice = await deferred.userChoice;
    // A prompt event is single-use; drop the stale reference either way.
    setDeferred(null);
    if (choice.outcome === "accepted") setInstalledByEvent(true);
    return choice.outcome;
  };

  const mode: InstallMode = installed
    ? "installed"
    : deferred !== null
      ? "native"
      : ios
        ? "ios"
        : "manual";
  return { mode, promptInstall };
}
