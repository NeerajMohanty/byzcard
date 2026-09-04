import "fake-indexeddb/auto";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QuickAccess } from "@/features/card/QuickAccess";
import { buildCard, validateCardFields } from "@/core/card/validate";

const validated = validateCardFields({
  fullName: "Ada Lovelace",
  role: "Chief Analyst",
  company: "Analytical Engines",
  phone: "+1 647 000 0000",
  email: "ada@example.com",
});
if (!validated.ok) throw new Error("fixture invalid");
const CARD = buildCard(validated.fields);

function renderQA() {
  return render(<QuickAccess card={CARD} photo={null} />);
}

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
    renderQA();
    expect(screen.getByRole("button", { name: "Add Byzcard to Home Screen" })).toBeDefined();
    expect(screen.getByText(/directly from your phone/u)).toBeDefined();
  });

  it("shows generic browser-menu instructions when no native prompt exists", async () => {
    renderQA();
    fireEvent.click(screen.getByRole("button", { name: "Add Byzcard to Home Screen" }));
    expect(await screen.findByRole("dialog")).toBeDefined();
    expect(screen.getByText(/browser's menu/u)).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Got it" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("instruction sheet has an explicit accessible Close (X) button", async () => {
    renderQA();
    fireEvent.click(screen.getByRole("button", { name: "Add Byzcard to Home Screen" }));
    expect(await screen.findByRole("dialog")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("returns focus to the trigger button after the sheet closes", async () => {
    renderQA();
    const trigger = screen.getByRole("button", { name: "Add Byzcard to Home Screen" });
    fireEvent.click(trigger);
    expect(await screen.findByRole("dialog")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("instruction sheet closes on Escape and on backdrop click, not inner clicks", async () => {
    renderQA();
    fireEvent.click(screen.getByRole("button", { name: "Add Byzcard to Home Screen" }));
    const dialog = await screen.findByRole("dialog");
    // A click inside the sheet must not dismiss it.
    fireEvent.click(dialog);
    expect(screen.queryByRole("dialog")).not.toBeNull();
    // Escape closes.
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    // Backdrop click closes.
    fireEvent.click(screen.getByRole("button", { name: "Add Byzcard to Home Screen" }));
    const backdrop = (await screen.findByRole("dialog")).parentElement;
    expect(backdrop).not.toBeNull();
    if (backdrop !== null) fireEvent.click(backdrop);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("captures beforeinstallprompt and runs the native prompt to acceptance", async () => {
    renderQA();
    const event = makeInstallPromptEvent("accepted");
    act(() => {
      window.dispatchEvent(event);
    });
    expect(event.defaultPrevented).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Add Byzcard to Home Screen" }));
    expect(await screen.findByText(/opens from your Home Screen/u)).toBeDefined();
    expect(event.prompt).toHaveBeenCalledTimes(1);
    // Installed state replaces the CTA.
    expect(screen.queryByRole("button", { name: "Add Byzcard to Home Screen" })).toBeNull();
  });

  it("handles native prompt dismissal and clears the stale prompt", async () => {
    renderQA();
    const event = makeInstallPromptEvent("dismissed");
    act(() => {
      window.dispatchEvent(event);
    });
    fireEvent.click(screen.getByRole("button", { name: "Add Byzcard to Home Screen" }));
    expect(await screen.findByText(/No problem/u)).toBeDefined();
    expect(event.prompt).toHaveBeenCalledTimes(1);
    // CTA remains; a second tap falls back to instructions (stale prompt gone).
    fireEvent.click(screen.getByRole("button", { name: "Add Byzcard to Home Screen" }));
    expect(await screen.findByRole("dialog")).toBeDefined();
    expect(event.prompt).toHaveBeenCalledTimes(1);
  });

  it("reacts to the appinstalled event", async () => {
    renderQA();
    act(() => {
      window.dispatchEvent(new Event("appinstalled"));
    });
    expect(await screen.findByText(/opens from your Home Screen/u)).toBeDefined();
  });

  it("iOS path opens the backup-first step and Escape dismisses it", async () => {
    const restore = setUserAgent(IPHONE_UA);
    try {
      renderQA();
      fireEvent.click(screen.getByRole("button", { name: "Add Byzcard to Home Screen" }));
      expect(await screen.findByRole("dialog", { name: "Save a backup first" })).toBeDefined();
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
      renderQA();
      expect(screen.getByText(/opens from your Home Screen/u)).toBeDefined();
      expect(screen.queryByRole("button", { name: "Add Byzcard to Home Screen" })).toBeNull();
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
    renderQA();
    expect(screen.getByText(/opens from your Home Screen/u)).toBeDefined();
  });
});

describe("iOS backup-first flow", () => {
  it("offers a predictable backup download before the install instructions", async () => {
    const restore = setUserAgent(IPHONE_UA);
    vi.stubGlobal(
      "URL",
      Object.assign(URL, { createObjectURL: () => "blob:t", revokeObjectURL: () => undefined }),
    );
    renderQA();
    fireEvent.click(screen.getByRole("button", { name: "Add Byzcard to Home Screen" }));
    expect(await screen.findByRole("dialog", { name: "Save a backup first" })).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Download backup" }));
    expect(await screen.findByText(/Backup ready — file: ada-lovelace\.byzcard/u)).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Continue to Home Screen instructions" }));
    const install = await screen.findByRole("dialog", {
      name: "Add Byzcard to your Home Screen",
    });
    expect(install.textContent).toContain("Share button in your browser");
    // The technical storage explanation is gone from the instructions.
    expect(install.textContent).not.toMatch(/its own storage|IndexedDB|WebKit/iu);
    restore();
  });

  it("allows continuing without a backup", async () => {
    const restore = setUserAgent(IPHONE_UA);
    renderQA();
    fireEvent.click(screen.getByRole("button", { name: "Add Byzcard to Home Screen" }));
    await screen.findByRole("dialog", { name: "Save a backup first" });
    fireEvent.click(screen.getByRole("button", { name: "Continue without backup" }));
    expect(
      await screen.findByRole("dialog", { name: "Add Byzcard to your Home Screen" }),
    ).toBeDefined();
    restore();
  });
});
