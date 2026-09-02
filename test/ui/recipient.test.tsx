import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RecipientScreen } from "@/features/recipient/RecipientScreen";
import { encodeSharePayload } from "@/core/share/codec";
import type { CardFields } from "@/core/card/types";

const FIELDS: CardFields = {
  fullName: "Šárka Nguyễn",
  role: "Field Engineer",
  company: "Компания Пример",
  phone: "+91 98765 43210",
  email: "sarka@example.com",
  website: "https://example.com",
  linkedin: "https://www.linkedin.com/in/sarka",
};

async function renderWithFragment(fragment: string) {
  window.location.hash = fragment;
  render(<RecipientScreen />);
}

describe("RecipientScreen", () => {
  it("decodes the fragment locally and renders the card", async () => {
    const fragment = await encodeSharePayload(FIELDS);
    await renderWithFragment(`#${fragment}`);
    expect(await screen.findByRole("heading", { name: "Šárka Nguyễn" })).toBeDefined();
    expect(screen.getByText("Field Engineer")).toBeDefined();
    expect(screen.getByText("Компания Пример")).toBeDefined();
    expect(screen.getByText("+91 98765 43210")).toBeDefined();
    expect(screen.getByRole("link", { name: "example.com" }).getAttribute("href")).toBe(
      "https://example.com",
    );
    expect(screen.getByRole("button", { name: "Save contact" })).toBeDefined();
    // Initials avatar, never a fetched photo.
    expect(screen.getByText("ŠN")).toBeDefined();
    expect(document.querySelector("img")).toBeNull();
  });

  it("omits optional rows when absent", async () => {
    const fragment = await encodeSharePayload({
      ...FIELDS,
      website: undefined,
      linkedin: undefined,
    });
    await renderWithFragment(`#${fragment}`);
    await screen.findByRole("heading", { name: "Šárka Nguyễn" });
    expect(screen.queryByText("Website")).toBeNull();
    expect(screen.queryByText("LinkedIn")).toBeNull();
  });

  it("shows a clear error for an empty fragment", async () => {
    await renderWithFragment("");
    expect(await screen.findByText(/does not contain a card/u)).toBeDefined();
  });

  it("shows a clear error for a damaged fragment", async () => {
    await renderWithFragment("#pXXXXnotvalid");
    expect(await screen.findByText(/damaged or incomplete/u)).toBeDefined();
  });
});
