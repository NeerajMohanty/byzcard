import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PrintPanel } from "@/features/print/PrintPanel";
import { PrintSheets } from "@/features/print/PrintSheets";
import { buildCard, validateCardFields } from "@/core/card/validate";
import { encodeQrText } from "@/core/qr";

function makeCard(withWebsite: boolean, withLinks = false) {
  const validated = validateCardFields({
    fullName: "Ada Lovelace",
    role: "Chief Analyst",
    company: "Analytical Engines",
    phone: "+1 647 000 0000",
    email: "ada@example.com",
    website: withWebsite ? "example.com" : "",
    linkedin: withLinks ? "linkedin.com/in/ada" : "",
    links: withLinks ? [{ service: "github", value: "github.com/ada" }] : [],
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
    // The badge is the same ID card: contact rows included.
    expect(sheet?.textContent).toContain("ada@example.com");
  });

  it("omits the website row on a blank website — never a placeholder dash", () => {
    const { container } = render(
      <PrintSheets format="cr80" card={makeCard(false)} photoUrl={null} qr={QR} />,
    );
    const sheet = container.querySelector("[data-print-format='cr80']");
    expect(sheet?.textContent).not.toContain("Website");
    expect(sheet?.textContent).not.toContain("—");
  });

  it("both formats print the complete ID card: profile + Quick Access, no app controls", () => {
    for (const format of ["cr80", "badge"] as const) {
      const { container, unmount } = render(
        <PrintSheets format={format} card={makeCard(true, true)} photoUrl={null} qr={QR} />,
      );
      const sheet = container.querySelector(`[data-print-format='${format}']`);
      expect(sheet?.querySelector("[data-part='profile']"), format).not.toBeNull();
      const quick = sheet?.querySelector("[data-part='quick']");
      expect(quick, format).not.toBeNull();
      expect(quick?.textContent).toContain("LinkedIn");
      expect(quick?.textContent).toContain("GitHub");
      // Paper: labels only — no anchors, no buttons, no app chrome.
      expect(sheet?.querySelector("a, button")).toBeNull();
      expect(sheet?.textContent).not.toContain("Save contact");
      expect(sheet?.textContent).not.toContain("Home Screen");
      unmount();
    }
  });

  it("renders a square QR tile in both formats", () => {
    for (const format of ["cr80", "badge"] as const) {
      const { container, unmount } = render(
        <PrintSheets format={format} card={makeCard(true)} photoUrl={null} qr={QR} />,
      );
      // The QR tile is the only element with an explicit img role (icons are decorative).
      const tiles = container.querySelectorAll("[role='img']");
      expect(tiles, format).toHaveLength(1);
      const qr = tiles[0];
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
