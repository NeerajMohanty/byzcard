import { render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import LandingPage, { metadata } from "@/app/page";

afterEach(() => {
  vi.unstubAllEnvs();
});

// The page is an async server component (it precomputes the demo QR), so it
// is awaited to plain JSX before rendering in jsdom.
async function renderLanding() {
  return render(await LandingPage());
}

describe("marketing homepage", () => {
  it("renders without IndexedDB or any stored personal card", async () => {
    // This suite never imports fake-indexeddb: the page must not touch it.
    const { container } = await renderLanding();
    expect(container.textContent).toContain("Byzcard");
  });

  it("brands with the Byzcard lockup and retires the uppercase wordmark", async () => {
    const { container } = await renderLanding();
    // The nav wordmark is the icon + "Byzcard" reading as one name.
    const nav = screen.getByRole("navigation", { name: "Main" });
    const home = within(nav).getByRole("link", { name: "Byzcard" });
    expect(home.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
    // No visible all-caps brand treatment remains anywhere on the page.
    expect(container.textContent).not.toContain("BYZCARD");
  });

  it("metadata carries the Byzcard casing", async () => {
    expect(String(metadata.title)).toBe("Byzcard — Your business card, on your phone");
    expect(metadata.openGraph?.siteName).toBe("Byzcard");
  });

  it("has exactly one h1 with the hero headline", async () => {
    await renderLanding();
    const h1s = screen.getAllByRole("heading", { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]?.textContent).toContain("Your next introduction");
    // "another" and the rotating word are siblings spaced by a flex gap, so
    // textContent runs them together.
    expect(h1s[0]?.textContent).toMatch(/another\s*app\./u);
  });

  it("every Create-my-card CTA links to /create", async () => {
    await renderLanding();
    const ctas = screen.getAllByRole("link", { name: /Create my card|Create a card to print/u });
    expect(ctas.length).toBeGreaterThanOrEqual(3);
    for (const cta of ctas) expect(cta.getAttribute("href")).toBe("/create");
  });

  it("See how it works points at the how-it-works section, which exists", async () => {
    const { container } = await renderLanding();
    const link = screen.getByRole("link", { name: "See how it works" });
    expect(link.getAttribute("href")).toBe("#how-it-works");
    expect(container.querySelector("#how-it-works")).not.toBeNull();
    expect(screen.getByRole("heading", { name: "Meet. Scan. Save." })).toBeDefined();
  });

  it("hero keeps the product concrete and the free model prominent", async () => {
    const { container } = await renderLanding();
    expect(container.textContent).toContain("digital business card");
    expect(screen.getByText("No signup. No subscription. No account.")).toBeDefined();
  });

  it("states that recipients don't need Byzcard installed", async () => {
    await renderLanding();
    expect(screen.getByText("They don’t need Byzcard installed.")).toBeDefined();
  });

  it("represents Home Screen access accurately (no universal-prompt claim)", async () => {
    const { container } = await renderLanding();
    // The share deck names each method twice: its own card and the summary.
    expect(screen.getAllByRole("heading", { name: "Keep it one tap away" })).toHaveLength(2);
    expect(container.textContent).not.toMatch(/every browser|all browsers/iu);
  });

  it("print section lists exactly the two real formats", async () => {
    const { container } = await renderLanding();
    expect(container.textContent).toContain("CR80 · 3.375 × 2.125 in");
    expect(container.textContent).toContain("4 × 6 in");
    expect(container.textContent).not.toMatch(/\bA4\b|\bA6\b|\bLetter\b/u);
  });

  it("privacy section never claims data never leaves the device", async () => {
    const { container } = await renderLanding();
    expect(container.querySelector("#privacy")).not.toBeNull();
    expect(container.textContent).not.toMatch(/never leaves/iu);
    expect(container.textContent).toContain("only when you intentionally use a sharing feature");
  });

  it("privacy comparison shows both journeys with the architectural punchline", async () => {
    const { container } = await renderLanding();
    expect(screen.getByText("Typical hosted digital card")).toBeDefined();
    const lanes = container.querySelectorAll("ol[class*=laneList]");
    expect(lanes).toHaveLength(2);
    expect(lanes[0]?.children).toHaveLength(4);
    expect(lanes[1]?.children).toHaveLength(4);
    expect(lanes[0]?.textContent).toContain("Recipient loads it from the service");
    expect(lanes[1]?.textContent).toContain("Recipient opens the shared card");
    expect(container.textContent).toContain("no service in the middle");
  });

  it("contains no fabricated social proof or statistics", async () => {
    const { container } = await renderLanding();
    expect(container.textContent).not.toMatch(/trusted by|testimonial|★|Join thousands/iu);
    expect(container.textContent).not.toMatch(/\d[\d,]* ?(users|customers|professionals)/iu);
  });

  it("presents Wallet as optional, never as the core requirement", async () => {
    await renderLanding();
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1.textContent).not.toMatch(/wallet/iu);
    expect(screen.getAllByRole("heading", { name: "Wallet, if you want it" })).toHaveLength(2);
    expect(
      screen.getAllByText(/Optional Apple and Google Wallet integrations are available/u),
    ).toHaveLength(2);
  });

  it("does not introduce theme functionality or theme copy", async () => {
    const { container } = await renderLanding();
    expect(container.textContent).not.toMatch(/theme/iu);
  });

  describe("GitHub link gating", () => {
    it("defaults to the public repository when NEXT_PUBLIC_GITHUB_URL is absent", async () => {
      await renderLanding();
      const links = [
        screen.getByRole("link", { name: "GitHub" }),
        screen.getByRole("link", { name: "View on GitHub" }),
      ];
      for (const link of links) {
        expect(link.getAttribute("href")).toBe("https://github.com/NeerajMohanty/byzcard");
        expect(link.getAttribute("target")).toBe("_blank");
        expect(link.getAttribute("rel")).toBe("noopener noreferrer");
      }
      // The navbar carries no GitHub link — it lives in Open Source + footer.
      const nav = screen.getByRole("navigation", { name: "Main" });
      expect(within(nav).queryByRole("link", { name: /GitHub/u })).toBeNull();
    });

    it("hides all GitHub links when NEXT_PUBLIC_GITHUB_URL is explicitly empty", async () => {
      vi.stubEnv("NEXT_PUBLIC_GITHUB_URL", "");
      await renderLanding();
      expect(screen.queryByRole("link", { name: /GitHub/u })).toBeNull();
      // The open-source story itself still exists.
      expect(screen.getByRole("heading", { name: "Open source. Yours to own." })).toBeDefined();
    });

    it("hides GitHub links for invalid values", async () => {
      for (const bad of [
        "http://github.com/x/y",
        "https://example.com/x",
        "https://github.com/",
        "nonsense",
      ]) {
        vi.stubEnv("NEXT_PUBLIC_GITHUB_URL", bad);
        const { unmount } = await renderLanding();
        expect(screen.queryByRole("link", { name: /GitHub/u }), bad).toBeNull();
        unmount();
        vi.unstubAllEnvs();
      }
    });

    it("shows safe GitHub links when configured with a valid URL", async () => {
      vi.stubEnv("NEXT_PUBLIC_GITHUB_URL", "https://github.com/example/byzcard");
      await renderLanding();
      const links = [
        ...screen.getAllByRole("link", { name: "GitHub" }),
        screen.getByRole("link", { name: "View on GitHub" }),
      ];
      expect(links.length).toBeGreaterThanOrEqual(2);
      for (const link of links) {
        expect(link.getAttribute("href")).toBe("https://github.com/example/byzcard");
        expect(link.getAttribute("target")).toBe("_blank");
        expect(link.getAttribute("rel")).toBe("noopener noreferrer");
      }
    });
  });
});
