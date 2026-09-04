import "fake-indexeddb/auto";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EditorScreen } from "@/features/editor/EditorScreen";
import { resetAllLocalData } from "@/adapters/idb/cardStore";
import { isIos, isStandaloneDisplay } from "@/lib/platform";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/lib/platform", () => ({
  isIos: vi.fn(() => false),
  isAndroid: vi.fn(() => false),
  isStandaloneDisplay: vi.fn(() => false),
}));

beforeEach(async () => {
  await resetAllLocalData();
  vi.mocked(isIos).mockReturnValue(false);
  vi.mocked(isStandaloneDisplay).mockReturnValue(false);
});

describe("standalone launch with an empty card store", () => {
  it("iOS: polished create flow with a subtle transport-agnostic restore option", async () => {
    vi.mocked(isIos).mockReturnValue(true);
    vi.mocked(isStandaloneDisplay).mockReturnValue(true);
    render(<EditorScreen />);
    await screen.findByLabelText(/Full name/u);
    // The normal create experience leads, framed as intentional.
    expect(screen.getByRole("heading", { name: "Create your card" })).toBeDefined();
    expect(
      screen.getByText("First time here? Create your card once and it will stay on this device."),
    ).toBeDefined();
    // Subtle recovery, decoupled from the transport, browser-generic wording.
    expect(
      screen.getByText(/Already created your card in a browser\? Restore the backup/u),
    ).toBeDefined();
    expect(
      screen.getByText(/Choose the \.byzcard file you saved before installing\./u),
    ).toBeDefined();
    expect(document.body.textContent).not.toContain("Safari");
    expect(screen.getByRole("button", { name: "Restore existing card" })).toBeDefined();
    // The old alarming technical explanation is gone, and nothing claims an
    // automatic transfer happened.
    expect(document.body.textContent).not.toMatch(/separate storage|its own storage|missing/iu);
    expect(document.body.textContent).not.toMatch(/automatically (transferred|moved)/iu);
    // Exactly one restore path (the generic import block collapses into it).
    const pickers = screen.getAllByLabelText("Import a .byzcard backup file");
    expect(pickers).toHaveLength(1);
    // No accept filter: iOS greys out unknown custom extensions, so any
    // file may be chosen — the strict content parser rejects invalid ones.
    expect(pickers[0]?.getAttribute("accept")).toBeNull();
  });

  it("Android/desktop standalone: no iOS-specific recovery copy", async () => {
    vi.mocked(isStandaloneDisplay).mockReturnValue(true); // installed, not iOS
    render(<EditorScreen />);
    await screen.findByLabelText(/Full name/u);
    expect(screen.queryByText(/Already created your card in a browser/u)).toBeNull();
    expect(screen.queryByRole("button", { name: "Restore existing card" })).toBeNull();
    // The generic cross-device import remains available.
    expect(
      screen.getByRole("button", { name: "Import card from a .byzcard backup" }),
    ).toBeDefined();
  });

  it("plain browser flow is unaffected", async () => {
    render(<EditorScreen />);
    await screen.findByLabelText(/Full name/u);
    expect(screen.queryByText(/First time here\?/u)).toBeNull();
    expect(screen.queryByText(/Already created your card in a browser/u)).toBeNull();
    expect(
      screen.getByRole("button", { name: "Import card from a .byzcard backup" }),
    ).toBeDefined();
  });
});
