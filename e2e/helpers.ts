import { expect, type Page } from "@playwright/test";
import { solidPng } from "../src/server/png";

export const TEST_CARD = {
  fullName: "Ada Lovelace",
  role: "Chief Analyst",
  company: "Analytical Engines",
  phone: "+1 647 000 0000",
  email: "ada@example.com",
  website: "example.com",
} as const;

/** Fill the editor form (optionally with a generated photo), no save. */
export async function fillCardForm(page: Page, withPhoto = true): Promise<void> {
  await page.getByLabel("Full name").fill(TEST_CARD.fullName);
  await page.getByLabel("Role / title").fill(TEST_CARD.role);
  await page.getByLabel("Company").fill(TEST_CARD.company);
  await page.getByLabel("Phone").fill(TEST_CARD.phone);
  await page.getByLabel("Email").fill(TEST_CARD.email);
  await page.getByLabel(/Website/u).fill(TEST_CARD.website);
  if (withPhoto) {
    await page.getByLabel(/Professional photo/u).setInputFiles({
      name: "photo.png",
      mimeType: "image/png",
      buffer: Buffer.from(solidPng(64, 120, 90, 60)),
    });
    await expect(page.getByAltText(`Photo of ${TEST_CARD.fullName}`).first()).toBeVisible();
  }
}

/** Create and save a card, landing on /card. */
export async function createCard(page: Page, withPhoto = true): Promise<void> {
  await page.goto("/create");
  await fillCardForm(page, withPhoto);
  await page.getByRole("button", { name: "Save card" }).click();
  await page.waitForURL("**/card");
}
