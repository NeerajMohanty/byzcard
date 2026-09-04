import { render, screen } from "@testing-library/react";
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

describe("CardView", () => {
  it("renders the reference hierarchy: company, role, name, contact rows", () => {
    render(<CardView fields={FIELDS} photoUrl={null} qr={null} />);
    expect(screen.getByText("Company")).toBeDefined();
    expect(screen.getByText("Analytical Engines")).toBeDefined();
    expect(screen.getByText("Chief Analyst")).toBeDefined();
    expect(screen.getByRole("heading", { name: "Ada Lovelace" })).toBeDefined();
    expect(screen.getByText("+1 647 000 0000")).toBeDefined();
    expect(screen.getByText("ada@example.com")).toBeDefined();
    expect(screen.getByText("example.com")).toBeDefined();
  });

  it("shows initials when there is no photo", () => {
    render(<CardView fields={FIELDS} photoUrl={null} qr={null} />);
    expect(screen.getByText("AL")).toBeDefined();
  });

  it("shows the photo image when a URL is provided", () => {
    render(<CardView fields={FIELDS} photoUrl="blob:fake" qr={null} />);
    const img = screen.getByAltText("Photo of Ada Lovelace");
    expect(img.getAttribute("src")).toBe("blob:fake");
  });

  it("keeps the WEBSITE row with a presentation-only em dash when absent", () => {
    render(<CardView fields={{ ...FIELDS, website: undefined }} photoUrl={null} qr={null} />);
    expect(screen.getByText("Website")).toBeDefined();
    const dash = screen.getByText("—");
    expect(dash.getAttribute("aria-label")).toBe("No website provided");
  });

  it("renders the photo in a 96px-wide 4:5 rounded rectangle (initials match)", () => {
    const { container, rerender } = render(
      <CardView fields={FIELDS} photoUrl="blob:fake" qr={null} />,
    );
    const frame = screen.getByAltText("Photo of Ada Lovelace").parentElement;
    expect(frame?.style.width).toBe("96px");
    expect(frame?.style.height).toBe("120px");
    expect(frame?.style.borderRadius).toBe("12px");
    expect(frame?.style.overflow).toBe("hidden");
    rerender(<CardView fields={FIELDS} photoUrl={null} qr={null} />);
    const initials = screen.getByText("AL");
    expect(initials.style.width).toBe("96px");
    expect(initials.style.height).toBe("120px");
    expect(initials.style.borderRadius).toBe("12px");
    expect(container.querySelector("img")).toBeNull();
  });

  it("applies the chosen crop as explicit cover layout (no empty frame space)", () => {
    // Square image, 4:5 frame: cover width 125%. zoom 1.6 → 200% × 160%;
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

  it("keeps a landscape photo covering the frame at zoom 1 (default crop)", () => {
    render(<CardView fields={FIELDS} photoUrl="blob:fake" qr={null} photoAspect={16 / 9} />);
    const img = screen.getByAltText("Photo of Ada Lovelace");
    // 16:9 in a 4:5 frame: width = (16/9)/(4/5) ≈ 222.2%, height exactly 100%.
    expect(parseFloat(img.style.width)).toBeCloseTo(222.222, 2);
    expect(parseFloat(img.style.height)).toBeCloseTo(100, 2);
    expect(parseFloat(img.style.top)).toBeCloseTo(0, 2);
  });

  it("shows preferred name, pronouns, headline and link chips when present", () => {
    render(
      <CardView
        fields={{
          ...FIELDS,
          preferredName: "Ada",
          pronouns: "she/her",
          headline: "Computing Pioneer",
          social: [{ service: "linkedin", value: "https://linkedin.com/in/ada" }],
          links: [{ service: "github", value: "https://github.com/ada" }],
        }}
        photoUrl={null}
        qr={null}
      />,
    );
    const heading = screen.getByRole("heading", { level: 2 });
    expect(heading.textContent).toBe("Ada(she/her)");
    // Full name stays canonical in data; only the display swaps.
    expect(screen.queryByText("Ada Lovelace")).toBeNull();
    expect(screen.getByText("Computing Pioneer")).toBeDefined();
    expect(screen.getByText("LinkedIn · GitHub")).toBeDefined();
  });

  it("renders no optional treatments when the fields are absent", () => {
    const { container } = render(<CardView fields={FIELDS} photoUrl={null} qr={null} />);
    expect(container.querySelector("[class*='pronouns']")).toBeNull();
    expect(container.querySelector("[class*='headline']")).toBeNull();
    expect(container.querySelector("[class*='linkChips']")).toBeNull();
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe("Ada Lovelace");
  });

  it("keeps the company label and value in one right-aligned stack", () => {
    const { container } = render(<CardView fields={FIELDS} photoUrl={null} qr={null} />);
    const stack = container.querySelector("[class*='headerStack']");
    expect(stack).not.toBeNull();
    expect(stack?.textContent).toContain("Company");
    expect(stack?.textContent).toContain("Analytical Engines");
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
  });

  it("renders the QR tile when a symbol is provided", () => {
    const qr = encodeQrText("https://byzcard.example/s#pTEST");
    render(<CardView fields={FIELDS} photoUrl={null} qr={qr} />);
    expect(screen.getByRole("img", { name: /QR code/u })).toBeDefined();
  });
});
