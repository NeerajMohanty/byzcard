import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import LandingPage from "@/app/page";

afterEach(() => {
  vi.unstubAllEnvs();
});

function renderLanding() {
  return render(<LandingPage />);
}

describe("marketing homepage", () => {
  it("renders without IndexedDB or any stored personal card", () => {
    // This suite never imports fake-indexeddb: the page must not touch it.
    const { container } = renderLanding();
    expect(container.textContent).toContain("BYZCARD");
  });

  it("has exactly one h1 with the hero headline", () => {
    renderLanding();
    const h1s = screen.getAllByRole("heading", { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]?.textContent).toContain("Your next introduction");
    expect(h1s[0]?.textContent).toContain("another app.");
  });

  it("every Create-my-card CTA links to /create", () => {
    renderLanding();
    const ctas = screen.getAllByRole("link", { name: /Create my card|Create a card to print/u });
    expect(ctas.length).toBeGreaterThanOrEqual(3);
    for (const cta of ctas) expect(cta.getAttribute("href")).toBe("/create");
  });

  it("See how it works points at the how-it-works section, which exists", () => {
    const { container } = renderLanding();
    const link = screen.getByRole("link", { name: "See how it works" });
    expect(link.getAttribute("href")).toBe("#how-it-works");
    expect(container.querySelector("#how-it-works")).not.toBeNull();
    expect(screen.getByRole("heading", { name: "Meet. Scan. Save." })).toBeDefined();
  });

  it("hero keeps the product concrete and the free model prominent", () => {
    const { container } = renderLanding();
    expect(container.textContent).toContain("digital business card");
    expect(screen.getByText("No signup. No subscription. No account.")).toBeDefined();
  });

  it("states that recipients don't need BYZCARD installed", () => {
    renderLanding();
    expect(screen.getByText("They don’t need BYZCARD installed.")).toBeDefined();
  });

  it("represents Home Screen access accurately (no universal-prompt claim)", () => {
    const { container } = renderLanding();
    expect(screen.getByRole("heading", { name: "Keep it one tap away" })).toBeDefined();
    expect(container.textContent).not.toMatch(/every browser|all browsers/iu);
  });

  it("print section lists exactly the two real formats", () => {
    const { container } = renderLanding();
    expect(container.textContent).toContain("CR80 · 3.375 × 2.125 in");
    expect(container.textContent).toContain("4 × 6 in");
    expect(container.textContent).not.toMatch(/\bA4\b|\bA6\b|\bLetter\b/u);
  });

  it("privacy section never claims data never leaves the device", () => {
    const { container } = renderLanding();
    expect(container.querySelector("#privacy")).not.toBeNull();
    expect(container.textContent).not.toMatch(/never leaves/iu);
    expect(container.textContent).toContain("only when you intentionally use a sharing feature");
  });

  it("privacy comparison shows both journeys with the architectural punchline", () => {
    const { container } = renderLanding();
    expect(screen.getByText("Typical hosted digital card")).toBeDefined();
    const lanes = container.querySelectorAll("ol[class*=laneList]");
    expect(lanes).toHaveLength(2);
    expect(lanes[0]?.children).toHaveLength(4);
    expect(lanes[1]?.children).toHaveLength(4);
    expect(lanes[0]?.textContent).toContain("Recipient loads it from the service");
    expect(lanes[1]?.textContent).toContain("Recipient opens the shared card");
    expect(container.textContent).toContain("no service in the middle");
  });

  it("contains no fabricated social proof or statistics", () => {
    const { container } = renderLanding();
    expect(container.textContent).not.toMatch(/trusted by|testimonial|★|Join thousands/iu);
    expect(container.textContent).not.toMatch(/\d[\d,]* ?(users|customers|professionals)/iu);
  });

  it("presents Wallet as optional, never as the core requirement", () => {
    renderLanding();
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1.textContent).not.toMatch(/wallet/iu);
    expect(screen.getByRole("heading", { name: "Wallet, if you want it" })).toBeDefined();
    expect(
      screen.getByText(/Optional Apple and Google Wallet integrations are available/u),
    ).toBeDefined();
  });

  it("does not introduce theme functionality or theme copy", () => {
    const { container } = renderLanding();
    expect(container.textContent).not.toMatch(/theme/iu);
  });

  describe("GitHub link gating", () => {
    it("hides all GitHub links when NEXT_PUBLIC_GITHUB_URL is absent", () => {
      renderLanding();
      expect(screen.queryByRole("link", { name: "GitHub" })).toBeNull();
      expect(screen.queryByRole("link", { name: "View on GitHub" })).toBeNull();
      // The open-source story itself still exists.
      expect(screen.getByRole("heading", { name: "Open by design." })).toBeDefined();
    });

    it("hides GitHub links for invalid values", () => {
      for (const bad of [
        "http://github.com/x/y",
        "https://example.com/x",
        "https://github.com/",
        "nonsense",
      ]) {
        vi.stubEnv("NEXT_PUBLIC_GITHUB_URL", bad);
        const { unmount } = renderLanding();
        expect(screen.queryByRole("link", { name: /GitHub/u }), bad).toBeNull();
        unmount();
        vi.unstubAllEnvs();
      }
    });

    it("shows safe GitHub links when configured with a valid URL", () => {
      vi.stubEnv("NEXT_PUBLIC_GITHUB_URL", "https://github.com/example/byzcard");
      renderLanding();
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
