import "fake-indexeddb/auto";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EditorScreen } from "@/features/editor/EditorScreen";
import { loadCard, resetAllLocalData, saveCard } from "@/adapters/idb/cardStore";
import { buildCard, validateCardFields } from "@/core/card/validate";

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

  it("adds LinkedIn and a GitHub link to an existing card and keeps them after reload", async () => {
    const seeded = validateCardFields({
      fullName: "Ada Lovelace",
      role: "Mathematician",
      company: "Analytical Engines Ltd",
      phone: "+44 20 555 01",
      email: "ada@example.com",
    });
    if (!seeded.ok) throw new Error("fixture must validate");
    await saveCard(buildCard(seeded.fields));

    render(<EditorScreen />);
    await screen.findByRole("button", { name: "Save changes" });
    fill(/LinkedIn/u, "linkedin.com/in/neerajmohanty");
    fireEvent.click(screen.getByRole("button", { name: "+ Add link" }));
    fireEvent.change(screen.getByLabelText("Links 1 URL"), {
      target: { value: "github.com/neerajmohanty" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/card"));

    // Persisted, normalized to https, alongside the untouched fields.
    const stored = await loadCard();
    expect(stored?.linkedin).toBe("https://linkedin.com/in/neerajmohanty");
    expect(stored?.links).toEqual([
      { service: "github", value: "https://github.com/neerajmohanty" },
    ]);
    expect(stored?.fullName).toBe("Ada Lovelace");

    // Reopening the editor later shows both again (reload persistence).
    // Queried by name: the first editor is still mounted and shares the
    // field ids, so label lookups would only ever resolve to it.
    render(<EditorScreen />);
    const values = (selector: string): string[] =>
      [...document.querySelectorAll<HTMLInputElement>(selector)].map((i) => i.value);
    await waitFor(() => {
      expect(values("input[name='linkedin']")).toContain("https://linkedin.com/in/neerajmohanty");
    });
    expect(values("input[aria-label='Links 1 URL']")).toContain("https://github.com/neerajmohanty");
  });

  it("edits a pre-existing saved card via Save changes, preserving everything untouched", async () => {
    // Fixture written straight through the store, the way any previously
    // shipped version persisted it — the editor must round-trip it.
    const seeded = validateCardFields({
      fullName: "Ada Lovelace",
      preferredName: "Ada",
      pronouns: "she/her",
      role: "Mathematician",
      headline: "Analytical engines",
      company: "Analytical Engines Ltd",
      phone: "+44 20 555 01",
      email: "ada@example.com",
      website: "https://example.com",
      linkedin: "https://www.linkedin.com/in/ada-demo",
      social: [],
      messaging: [{ service: "whatsapp", value: "https://wa.me/442055501" }],
      links: [{ service: "github", value: "https://github.com/ada-demo" }],
    });
    if (!seeded.ok) throw new Error("fixture must validate");
    const original = buildCard(seeded.fields);
    await saveCard(original);

    render(<EditorScreen />);
    await screen.findByText("Edit your card");
    // The saved values populate the form, and the primary action reads as an
    // edit — creation wording never appears.
    expect(screen.getByLabelText<HTMLInputElement>(/Full name/u).value).toBe("Ada Lovelace");
    expect(screen.queryByRole("button", { name: "Save card" })).toBeNull();

    fill(/Role/u, "Director of Research");
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => {
      expect(push).toHaveBeenCalledWith("/card");
    });

    const stored = await loadCard();
    expect(stored?.role).toBe("Director of Research");
    // Same record, not a duplicate: identity and creation time survive.
    expect(stored?.id).toBe(original.id);
    expect(stored?.createdAt).toBe(original.createdAt);
    // Every untouched field — required and optional — is preserved.
    expect(stored?.fullName).toBe("Ada Lovelace");
    expect(stored?.preferredName).toBe("Ada");
    expect(stored?.pronouns).toBe("she/her");
    expect(stored?.headline).toBe("Analytical engines");
    expect(stored?.company).toBe("Analytical Engines Ltd");
    expect(stored?.phone).toBe("+44 20 555 01");
    expect(stored?.email).toBe("ada@example.com");
    expect(stored?.website).toBe("https://example.com");
    expect(stored?.linkedin).toBe("https://www.linkedin.com/in/ada-demo");
    expect(stored?.messaging).toEqual([{ service: "whatsapp", value: "https://wa.me/442055501" }]);
    expect(stored?.links).toEqual([{ service: "github", value: "https://github.com/ada-demo" }]);
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
