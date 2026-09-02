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

  it("omits the website row when absent", () => {
    render(<CardView fields={{ ...FIELDS, website: undefined }} photoUrl={null} qr={null} />);
    expect(screen.queryByText("Website")).toBeNull();
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
