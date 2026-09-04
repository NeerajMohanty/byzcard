import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PrintPanel } from "@/features/print/PrintPanel";
import { PrintSheets } from "@/features/print/PrintSheets";
import { buildCard, validateCardFields } from "@/core/card/validate";
import { encodeQrText } from "@/core/qr";

function makeCard(withWebsite: boolean) {
  const validated = validateCardFields({
    fullName: "Ada Lovelace",
    role: "Chief Analyst",
    company: "Analytical Engines",
    phone: "+1 647 000 0000",
    email: "ada@example.com",
    website: withWebsite ? "example.com" : "",
  });
  if (!validated.ok) throw new Error("fixture invalid");
  return buildCard(validated.fields);
}

const QR = encodeQrText("https://byzcard.example/s#pTEST");

afterEach(() => {
  vi.restoreAllMocks();
});

describe("PrintPanel", () => {
  it("presents exactly the two V1 formats with physical dimensions", () => {
    render(<PrintPanel format="cr80" onFormatChange={() => undefined} ready />);
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(2);
    expect(screen.getByText("Standard ID Card — CR80")).toBeDefined();
    expect(screen.getByText("3.375 × 2.125 in")).toBeDefined();
    expect(screen.getByText("Event Badge")).toBeDefined();
    expect(screen.getByText("4 × 6 in")).toBeDefined();
  });

  it("reports format selection and invokes window.print on the action", () => {
    const onChange = vi.fn();
    const printSpy = vi.spyOn(window, "print").mockImplementation(() => undefined);
    render(<PrintPanel format="cr80" onFormatChange={onChange} ready />);
    fireEvent.click(screen.getByRole("radio", { name: /Event Badge/u }));
    expect(onChange).toHaveBeenCalledWith("badge");
    fireEvent.click(screen.getByRole("button", { name: "Print / Save as PDF" }));
    expect(printSpy).toHaveBeenCalledTimes(1);
  });

  it("disables printing until the QR is ready", () => {
    const printSpy = vi.spyOn(window, "print").mockImplementation(() => undefined);
    render(<PrintPanel format="cr80" onFormatChange={() => undefined} ready={false} />);
    const button = screen.getByRole("button", { name: "Print / Save as PDF" });
    expect(button.hasAttribute("disabled")).toBe(true);
    fireEvent.click(button);
    expect(printSpy).not.toHaveBeenCalled();
  });

  it("mentions 100% / actual-size printing guidance", () => {
    render(<PrintPanel format="cr80" onFormatChange={() => undefined} ready />);
    expect(screen.getByText(/100% \/ Actual size/u)).toBeDefined();
  });
});

describe("PrintSheets", () => {
  it("renders the CR80 layout from local card data with the correct @page size", () => {
    const { container } = render(
      <PrintSheets format="cr80" card={makeCard(true)} photoUrl={null} qr={QR} />,
    );
    const sheet = container.querySelector("[data-print-format='cr80']");
    expect(sheet).not.toBeNull();
    expect(sheet?.textContent).toContain("Ada Lovelace");
    expect(sheet?.textContent).toContain("Analytical Engines");
    expect(sheet?.textContent).toContain("example.com");
    expect(container.querySelector("style")?.textContent).toContain("3.375in 2.125in");
    // Print root is hidden from normal screen rendering by class.
    expect(container.querySelector(".printOnly")).not.toBeNull();
  });

  it("renders the event badge layout with scan prompt and @page 4x6", () => {
    const { container } = render(
      <PrintSheets format="badge" card={makeCard(true)} photoUrl={null} qr={QR} />,
    );
    const sheet = container.querySelector("[data-print-format='badge']");
    expect(sheet).not.toBeNull();
    expect(sheet?.textContent).toContain("Scan to connect");
    expect(container.querySelector("style")?.textContent).toContain("4in 6in");
    // Badge deliberately omits phone/email — the QR carries the contact.
    expect(sheet?.textContent).not.toContain("ada@example.com");
  });

  it("uses the presentation-only em dash for a blank website on CR80", () => {
    const { container } = render(
      <PrintSheets format="cr80" card={makeCard(false)} photoUrl={null} qr={QR} />,
    );
    const sheet = container.querySelector("[data-print-format='cr80']");
    expect(sheet?.textContent).toContain("Website");
    expect(sheet?.textContent).toContain("—");
  });

  it("renders a square QR tile in both formats", () => {
    for (const format of ["cr80", "badge"] as const) {
      const { container, unmount } = render(
        <PrintSheets format={format} card={makeCard(true)} photoUrl={null} qr={QR} />,
      );
      const qr = container.querySelector("[role='img']");
      expect(qr, format).not.toBeNull();
      // Scope to the QR tile: the brand lockup contributes its own svg.
      expect(qr?.querySelector("svg")?.getAttribute("viewBox")).toBe(`0 0 ${QR.size} ${QR.size}`);
      unmount();
    }
  });

  it("renders nothing until the QR exists", () => {
    const { container } = render(
      <PrintSheets format="cr80" card={makeCard(true)} photoUrl={null} qr={null} />,
    );
    expect(container.innerHTML).toBe("");
  });
});
