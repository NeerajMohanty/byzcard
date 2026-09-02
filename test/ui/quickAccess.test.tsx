import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QuickAccess } from "@/features/card/QuickAccess";

const IPHONE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1";

function setUserAgent(value: string): () => void {
  const original = Object.getOwnPropertyDescriptor(Navigator.prototype, "userAgent");
  Object.defineProperty(navigator, "userAgent", { value, configurable: true });
  return () => {
    if (original !== undefined) Object.defineProperty(Navigator.prototype, "userAgent", original);
    Reflect.deleteProperty(navigator, "userAgent");
  };
}

function makeInstallPromptEvent(outcome: "accepted" | "dismissed") {
  return Object.assign(new Event("beforeinstallprompt", { cancelable: true }), {
    prompt: vi.fn(() => Promise.resolve()),
    userChoice: Promise.resolve({ outcome }),
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("QuickAccess (Add to Home Screen)", () => {
  it("renders the primary CTA and does not throw in unsupported browsers", () => {
    render(<QuickAccess />);
    expect(screen.getByRole("button", { name: "Add BYZCARD to Home Screen" })).toBeDefined();
    expect(screen.getByText(/directly from your phone/u)).toBeDefined();
  });

  it("shows generic browser-menu instructions when no native prompt exists", async () => {
    render(<QuickAccess />);
    fireEvent.click(screen.getByRole("button", { name: "Add BYZCARD to Home Screen" }));
    expect(await screen.findByRole("dialog")).toBeDefined();
    expect(screen.getByText(/browser's menu/u)).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Got it" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("captures beforeinstallprompt and runs the native prompt to acceptance", async () => {
    render(<QuickAccess />);
    const event = makeInstallPromptEvent("accepted");
    act(() => {
      window.dispatchEvent(event);
    });
    expect(event.defaultPrevented).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Add BYZCARD to Home Screen" }));
    expect(await screen.findByText(/opens from your Home Screen/u)).toBeDefined();
    expect(event.prompt).toHaveBeenCalledTimes(1);
    // Installed state replaces the CTA.
    expect(screen.queryByRole("button", { name: "Add BYZCARD to Home Screen" })).toBeNull();
  });

  it("handles native prompt dismissal and clears the stale prompt", async () => {
    render(<QuickAccess />);
    const event = makeInstallPromptEvent("dismissed");
    act(() => {
      window.dispatchEvent(event);
    });
    fireEvent.click(screen.getByRole("button", { name: "Add BYZCARD to Home Screen" }));
    expect(await screen.findByText(/No problem/u)).toBeDefined();
    expect(event.prompt).toHaveBeenCalledTimes(1);
    // CTA remains; a second tap falls back to instructions (stale prompt gone).
    fireEvent.click(screen.getByRole("button", { name: "Add BYZCARD to Home Screen" }));
    expect(await screen.findByRole("dialog")).toBeDefined();
    expect(event.prompt).toHaveBeenCalledTimes(1);
  });

  it("reacts to the appinstalled event", async () => {
    render(<QuickAccess />);
    act(() => {
      window.dispatchEvent(new Event("appinstalled"));
    });
    expect(await screen.findByText(/opens from your Home Screen/u)).toBeDefined();
  });

  it("shows Safari-specific manual instructions on iOS", async () => {
    const restore = setUserAgent(IPHONE_UA);
    try {
      render(<QuickAccess />);
      fireEvent.click(screen.getByRole("button", { name: "Add BYZCARD to Home Screen" }));
      expect(await screen.findByRole("dialog")).toBeDefined();
      expect(screen.getByText(/Share button in Safari/u)).toBeDefined();
      expect(screen.getByText(/“Add to Home Screen”/u)).toBeDefined();
      // Escape also dismisses (accessibility).
      fireEvent.keyDown(document, { key: "Escape" });
      expect(screen.queryByRole("dialog")).toBeNull();
    } finally {
      restore();
    }
  });

  it("detects iOS standalone mode and shows the installed state instead", () => {
    const restore = setUserAgent(IPHONE_UA);
    const nav: Navigator & { standalone?: boolean } = navigator;
    Object.defineProperty(nav, "standalone", { value: true, configurable: true });
    try {
      render(<QuickAccess />);
      expect(screen.getByText(/opens from your Home Screen/u)).toBeDefined();
      expect(screen.queryByRole("button", { name: "Add BYZCARD to Home Screen" })).toBeNull();
    } finally {
      Reflect.deleteProperty(nav, "standalone");
      restore();
    }
  });

  it("detects display-mode standalone via matchMedia", () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query === "(display-mode: standalone)",
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }));
    render(<QuickAccess />);
    expect(screen.getByText(/opens from your Home Screen/u)).toBeDefined();
  });
});
