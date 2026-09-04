import "fake-indexeddb/auto";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EditorScreen } from "@/features/editor/EditorScreen";
import { loadCard, resetAllLocalData } from "@/adapters/idb/cardStore";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
}));

beforeEach(async () => {
  push.mockClear();
  await resetAllLocalData();
});

function fill(label: RegExp, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

describe("EditorScreen", () => {
  it("uses device-neutral storage copy", async () => {
    render(<EditorScreen />);
    await screen.findByLabelText(/Full name/u);
    expect(
      screen.getByText("Your card and photo are stored only in this browser, on this device."),
    ).toBeDefined();
    expect(document.body.textContent).not.toContain("on this phone");
  });

  it("live-updates the card preview while typing", async () => {
    render(<EditorScreen />);
    await screen.findByLabelText(/Full name/u);
    fill(/Full name/u, "Grace Hopper");
    expect(screen.getByRole("heading", { name: "Grace Hopper" })).toBeDefined();
    fill(/Company/u, "US Navy");
    expect(screen.getByText("US Navy")).toBeDefined();
  });

  it("shows validation errors and does not save an invalid card", async () => {
    render(<EditorScreen />);
    await screen.findByLabelText(/Full name/u);
    fill(/Full name/u, "Grace Hopper");
    fireEvent.click(screen.getByRole("button", { name: "Save card" }));
    expect(await screen.findAllByRole("alert")).not.toHaveLength(0);
    expect(await loadCard()).toBeNull();
    expect(push).not.toHaveBeenCalled();
  });

  it("saves a valid card to IndexedDB and navigates to /card", async () => {
    render(<EditorScreen />);
    await screen.findByLabelText(/Full name/u);
    fill(/Full name/u, "Grace Hopper");
    fill(/Role/u, "Rear Admiral");
    fill(/Company/u, "US Navy");
    fill(/Phone/u, "+1 202 555 0100");
    fill(/Email/u, "grace@example.com");
    fireEvent.click(screen.getByRole("button", { name: "Save card" }));
    await waitFor(async () => {
      expect(push).toHaveBeenCalledWith("/card");
    });
    const stored = await loadCard();
    expect(stored?.fullName).toBe("Grace Hopper");
    expect(stored?.schemaVersion).toBe(1);
  });

  it("loads an existing card back into the form for editing", async () => {
    render(<EditorScreen />);
    await screen.findByLabelText(/Full name/u);
    fill(/Full name/u, "Grace Hopper");
    fill(/Role/u, "Rear Admiral");
    fill(/Company/u, "US Navy");
    fill(/Phone/u, "+1 202 555 0100");
    fill(/Email/u, "grace@example.com");
    fireEvent.click(screen.getByRole("button", { name: "Save card" }));
    await waitFor(() => expect(push).toHaveBeenCalled());

    // Fresh mount — simulates reopening /create later.
    render(<EditorScreen />);
    const inputs = await screen.findAllByLabelText(/Full name/u);
    await waitFor(() => {
      expect(inputs.some((i) => (i as HTMLInputElement).value === "Grace Hopper")).toBe(true);
    });
  });
});
