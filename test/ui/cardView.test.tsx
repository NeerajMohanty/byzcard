import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CardView } from "@/components/CardView";
import { encodeQrText } from "@/core/qr";

const FIELDS = {
  fullName: "Ada Lovelace",
  role: "Chief Analyst",
  company: "Analytical Engines",
  phone: "+1 647 000 0000",
  email: "ada@example.com",
  website: "https://example.com",
};

const FULL = {
  ...FIELDS,
  preferredName: "Ada",
  pronouns: "she/her",
  headline: "Computing Pioneer",
  linkedin: "https://www.linkedin.com/in/ada",
  social: [
    { service: "linkedin", value: "https://linkedin.com/in/ada" }, // same destination again
    { service: "instagram", value: "https://instagram.com/ada" },
  ],
  messaging: [{ service: "whatsapp", value: "https://wa.me/15550100100" }],
  links: [
    { service: "github", value: "https://github.com/ada" },
    { service: "custom", value: "https://ada.example.org/portfolio" },
  ],
};

const QR = encodeQrText("https://byzcard.example/s#pTEST");

const article = () => screen.getByRole("article", { name: "Business card preview" });
const quick = () => screen.getByRole("region", { name: "Quick Access" });

describe("CardView — the ID card", () => {
  it("renders the profile hierarchy: company, role, name + pronouns, tagline, contact, QR", () => {
    render(<CardView fields={FULL} photoUrl={null} qr={QR} />);
    expect(screen.getByText("Analytical Engines")).toBeDefined();
    expect(screen.getByText("Chief Analyst")).toBeDefined();
    expect(screen.getByRole("heading", { level: 2, name: "Ada (she/her)" })).toBeDefined();
    // Full name stays canonical in data; only the display swaps.
    expect(screen.queryByText("Ada Lovelace")).toBeNull();
    expect(screen.getByText("Computing Pioneer")).toBeDefined();
    expect(screen.getByText("+1 647 000 0000")).toBeDefined();
    expect(screen.getByText("ada@example.com")).toBeDefined();
    expect(screen.getByText("example.com")).toBeDefined();
    expect(screen.getByRole("img", { name: /QR code/u })).toBeDefined();
    // No "Company" caption and no logo block — the name stands on its own.
    expect(screen.queryByText("Company")).toBeNull();
  });

  it("is one container holding the dark profile section and then the Quick Access section", () => {
    render(<CardView fields={FULL} photoUrl={null} qr={QR} />);
    const card = article();
    const profile = card.querySelector("[data-part='profile']");
    const quickSection = card.querySelector("[data-part='quick']");
    expect(profile).not.toBeNull();
    expect(quickSection).not.toBeNull();
    expect(card.contains(quick())).toBe(true);
    // Profile precedes Quick Access inside the same card.
    expect(
      (profile?.compareDocumentPosition(quickSection as Node) ?? 0) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    // Nothing else lives in the card: no buttons, no app controls.
    expect(card.querySelector("button")).toBeNull();
  });

  it("lists optional links as labelled Quick Access tiles, once per destination, in order", () => {
    render(<CardView fields={FULL} photoUrl={null} qr={QR} />);
    const labels = [...quick().querySelectorAll("li")].map((li) => li.textContent);
    expect(labels).toEqual(["LinkedIn", "Instagram", "WhatsApp", "GitHub", "ada.example.org"]);
    // Every tile carries an icon, and no raw URL is ever visible text.
    expect(quick().querySelectorAll("li svg")).toHaveLength(5);
    expect(screen.queryByText(/https?:\/\//u)).toBeNull();
    // The old "LinkedIn · GitHub" text row is gone from the profile section.
    expect(article().querySelector("[data-part='profile']")?.textContent).not.toContain("·");
  });

  it("omits the Quick Access section entirely when the card has no optional links", () => {
    render(<CardView fields={FIELDS} photoUrl={null} qr={QR} />);
    expect(article().querySelector("[data-part='quick']")).toBeNull();
    expect(screen.queryByRole("region", { name: "Quick Access" })).toBeNull();
  });

  it("renders no anchors by default (preview, print, landing example)", () => {
    render(<CardView fields={FULL} photoUrl={null} qr={QR} />);
    expect(article().querySelector("a")).toBeNull();
  });

  it("interactive: contact rows and Quick Access tiles are real links with safe attributes", () => {
    render(<CardView fields={FULL} photoUrl={null} qr={QR} interactive />);
    expect(screen.getByRole("link", { name: "+1 647 000 0000" }).getAttribute("href")).toBe(
      "tel:+16470000000",
    );
    expect(screen.getByRole("link", { name: "ada@example.com" }).getAttribute("href")).toBe(
      "mailto:ada@example.com",
    );
    const website = screen.getByRole("link", { name: "example.com" });
    expect(website.getAttribute("href")).toBe("https://example.com");
    expect(website.getAttribute("target")).toBe("_blank");
    expect(website.getAttribute("rel")).toBe("noopener noreferrer");
    const tiles = within(quick()).getAllByRole("link");
    expect(tiles.map((a) => [a.textContent, a.getAttribute("href")])).toEqual([
      ["LinkedIn", "https://www.linkedin.com/in/ada"],
      ["Instagram", "https://instagram.com/ada"],
      ["WhatsApp", "https://wa.me/15550100100"],
      ["GitHub", "https://github.com/ada"],
      ["ada.example.org", "https://ada.example.org/portfolio"],
    ]);
    for (const a of tiles) {
      expect(a.getAttribute("target")).toBe("_blank");
      expect(a.getAttribute("rel")).toBe("noopener noreferrer");
    }
  });

  it("hides the website row when absent — no placeholder dash", () => {
    render(<CardView fields={{ ...FIELDS, website: undefined }} photoUrl={null} qr={null} />);
    expect(screen.queryByText("Website")).toBeNull();
    expect(screen.queryByText("—")).toBeNull();
    expect(screen.getByText("Phone")).toBeDefined(); // accessible row labels stay
  });

  it("hides pronouns and tagline when absent", () => {
    const { container } = render(<CardView fields={FIELDS} photoUrl={null} qr={null} />);
    expect(container.querySelector("[class*='pronouns']")).toBeNull();
    expect(container.querySelector("[class*='tagline']")).toBeNull();
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe("Ada Lovelace");
  });

  it("shows initials in a circle when there is no photo", () => {
    render(<CardView fields={FIELDS} photoUrl={null} qr={null} />);
    const initials = screen.getByText("AL");
    expect(initials.style.borderRadius).toBe("50%");
    expect(initials.style.width).toBe("104px");
    expect(initials.style.height).toBe("104px");
  });

  it("renders the photo in a circle inscribed in the stored 4:5 crop window", () => {
    const { container } = render(<CardView fields={FIELDS} photoUrl="blob:fake" qr={null} />);
    const img = screen.getByAltText("Photo of Ada Lovelace");
    expect(img.getAttribute("src")).toBe("blob:fake");
    const window_ = img.parentElement;
    const ring = window_?.parentElement;
    expect(window_?.style.height).toBe("125%");
    expect(window_?.style.top).toBe("-12.5%");
    expect(ring?.style.borderRadius).toBe("50%");
    expect(ring?.style.width).toBe("104px");
    expect(ring?.style.height).toBe("104px");
    expect(ring?.style.overflow).toBe("hidden");
    expect(container.querySelectorAll("img")).toHaveLength(1);
  });

  it("applies the chosen crop as explicit cover layout (no empty frame space)", () => {
    // Square image, 4:5 window: cover width 125%. zoom 1.6 → 200% × 160%;
    // x=0.4 pans right within the overflow, y=-0.2 pans up.
    render(
      <CardView
        fields={FIELDS}
        photoUrl="blob:fake"
        qr={null}
        photoCrop={{ x: 0.4, y: -0.2, zoom: 1.6 }}
      />,
    );
    const img = screen.getByAltText("Photo of Ada Lovelace");
    expect(parseFloat(img.style.width)).toBeCloseTo(200, 2);
    expect(parseFloat(img.style.height)).toBeCloseTo(160, 2);
    expect(parseFloat(img.style.left)).toBeCloseTo(-30, 2);
    expect(parseFloat(img.style.top)).toBeCloseTo(-36, 2);
  });

  it("keeps a landscape photo covering the window at zoom 1 (default crop)", () => {
    render(<CardView fields={FIELDS} photoUrl="blob:fake" qr={null} photoAspect={16 / 9} />);
    const img = screen.getByAltText("Photo of Ada Lovelace");
    expect(parseFloat(img.style.width)).toBeCloseTo(222.222, 2);
    expect(parseFloat(img.style.height)).toBeCloseTo(100, 2);
    expect(parseFloat(img.style.top)).toBeCloseTo(0, 2);
  });

  it("renders placeholders while fields are empty (live preview)", () => {
    render(
      <CardView
        fields={{ fullName: "", role: "", company: "", phone: "", email: "" }}
        photoUrl={null}
        qr={null}
      />,
    );
    expect(screen.getByText("Your Name")).toBeDefined();
    expect(screen.getByText("Company Name")).toBeDefined();
    expect(screen.getByText("+1 000 000 0000")).toBeDefined();
    expect(screen.getByText("you@example.com")).toBeDefined();
    expect(screen.queryByText("Website")).toBeNull();
    expect(screen.queryByRole("region")).toBeNull();
  });

  it("print variants keep the same two-section structure", () => {
    const printed = () => screen.getByRole("article", { name: "Printed business card" });
    const { rerender } = render(<CardView fields={FULL} photoUrl={null} qr={QR} variant="cr80" />);
    expect(printed().getAttribute("data-variant")).toBe("cr80");
    expect(printed().querySelector("[data-part='profile']")).not.toBeNull();
    expect(printed().querySelector("[data-part='quick']")).not.toBeNull();
    expect(screen.queryByText("Scan to connect")).toBeNull();
    rerender(<CardView fields={FULL} photoUrl={null} qr={QR} variant="badge" />);
    expect(printed().getAttribute("data-variant")).toBe("badge");
    expect(screen.getByText("Scan to connect")).toBeDefined();
    expect(printed().querySelector("a, button")).toBeNull();
  });
});
