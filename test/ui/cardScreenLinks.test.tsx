import "fake-indexeddb/auto";
import { render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CardScreen } from "@/features/card/CardScreen";
import { resetAllLocalData, saveCard } from "@/adapters/idb/cardStore";
import { buildCard, validateCardFields } from "@/core/card/validate";

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace }),
}));

beforeEach(async () => {
  replace.mockClear();
  await resetAllLocalData();
});

async function seed(extra: Record<string, unknown>) {
  const validated = validateCardFields({
    fullName: "Ada Lovelace",
    role: "Chief Analyst",
    company: "Analytical Engines",
    phone: "+1 647 000 0000",
    email: "ada@example.com",
    website: "example.com",
    ...extra,
  });
  if (!validated.ok) throw new Error("fixture must validate");
  await saveCard(buildCard(validated.fields));
}

describe("CardScreen: saved optional links reach Quick Access", () => {
  it("renders the saved LinkedIn field as a tappable Quick Access link", async () => {
    await seed({ linkedin: "https://linkedin.com/in/neerajmohanty" });
    render(<CardScreen />);
    const card = await screen.findByRole("article", { name: "Business card preview" });
    const link = within(card).getByRole("link", { name: "LinkedIn" });
    expect(link.getAttribute("href")).toBe("https://linkedin.com/in/neerajmohanty");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
    // The link lives in the card's own Quick Access section.
    const quick = within(card).getByRole("region", { name: "Quick Access" });
    expect(card.contains(quick)).toBe(true);
    expect(quick.contains(link)).toBe(true);
  });

  it("renders GitHub, social, messaging and custom links from the saved card", async () => {
    await seed({
      social: [{ service: "instagram", value: "https://instagram.com/ada" }],
      messaging: [{ service: "whatsapp", value: "https://wa.me/15550100100" }],
      links: [
        { service: "github", value: "https://github.com/ada" },
        { service: "custom", value: "https://ada.example.org" },
      ],
    });
    render(<CardScreen />);
    const card = await screen.findByRole("article", { name: "Business card preview" });
    const quick = within(card).getByRole("region", { name: "Quick Access" });
    const rows = [...quick.querySelectorAll("a")].map((a) => [
      a.textContent,
      a.getAttribute("href"),
    ]);
    expect(rows).toEqual([
      ["Instagram", "https://instagram.com/ada"],
      ["WhatsApp", "https://wa.me/15550100100"],
      ["GitHub", "https://github.com/ada"],
      ["ada.example.org", "https://ada.example.org"],
    ]);
  });

  it("shows no Quick Access section when the card has no optional links", async () => {
    await seed({});
    render(<CardScreen />);
    await screen.findByRole("heading", { name: "Home Screen" });
    const card = screen.getByRole("article", { name: "Business card preview" });
    await waitFor(() =>
      expect(within(card).getByRole("heading", { name: "Ada Lovelace" })).toBeDefined(),
    );
    expect(within(card).queryByRole("region", { name: "Quick Access" })).toBeNull();
    // App controls stay outside the card.
    const install = screen.getByRole("button", { name: "Add Byzcard to Home Screen" });
    expect(card.contains(install)).toBe(false);
  });

  it("makes phone, email and website on the owner card tappable", async () => {
    await seed({});
    render(<CardScreen />);
    const card = await screen.findByRole("article", { name: "Business card preview" });
    const phone = card.querySelector("a[href^='tel:']");
    const email = card.querySelector("a[href^='mailto:']");
    const website = card.querySelector("a[href='https://example.com']");
    expect(phone?.getAttribute("href")).toBe("tel:+16470000000");
    expect(email?.getAttribute("href")).toBe("mailto:ada@example.com");
    expect(website?.getAttribute("rel")).toBe("noopener noreferrer");
    expect(website?.textContent).toBe("example.com");
  });
});
