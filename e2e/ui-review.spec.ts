/**
 * Visual review artifacts: real screenshots from the production build at
 * phone size, for human design comparison against the reference layout.
 * Output: artifacts/ui-review/<project>-<name>.png (gitignored).
 */
import { mkdirSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { createCard, fillCardForm, TEST_CARD } from "./helpers";

const DIR = "artifacts/ui-review";

test.skip(({ isMobile }) => !isMobile, "UI review screenshots are captured at phone size only");

async function captureLanding(page: Page, shot: (name: string) => string): Promise<void> {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Create your card" })).toBeVisible();
  await expect(page.getByRole("img", { name: /QR code/u })).toBeVisible();
  await page.screenshot({ path: shot("01-landing"), fullPage: true });
}

async function captureValidationErrors(page: Page, shot: (name: string) => string): Promise<void> {
  await page.goto("/create");
  await page.getByRole("button", { name: "Save card" }).click();
  await expect(page.getByText("Name is required")).toBeVisible();
  await page.screenshot({ path: shot("02-validation-errors"), fullPage: true });
}

async function captureEditorAndCard(page: Page, shot: (name: string) => string): Promise<void> {
  await page.goto("/create");
  await fillCardForm(page, true);
  await expect(page.getByRole("img", { name: /QR code/u })).toBeVisible();
  await page.screenshot({ path: shot("03-create-filled"), fullPage: true });
  await page
    .getByRole("article", { name: "Business card preview" })
    .screenshot({ path: shot("04-live-preview-card") });

  await page.getByRole("button", { name: "Save card" }).click();
  await page.waitForURL("**/card");
  await expect(page.getByRole("img", { name: /QR code/u })).toBeVisible();
  await page.screenshot({ path: shot("05-card-screen"), fullPage: true });
  await page
    .getByRole("article", { name: "Business card preview" })
    .screenshot({ path: shot("06-card-hero") });
}

async function captureRecipient(page: Page, shot: (name: string) => string): Promise<void> {
  const shareUrl = await page.locator("[data-share-url]").getAttribute("data-share-url");
  expect(shareUrl).not.toBeNull();
  await page.goto(shareUrl ?? "");
  await expect(page.getByRole("heading", { name: TEST_CARD.fullName })).toBeVisible();
  await page.screenshot({ path: shot("07-recipient"), fullPage: true });
}

async function captureInitialsCard(page: Page, shot: (name: string) => string): Promise<void> {
  page.on("dialog", (dialog) => void dialog.accept());
  await page.goto("/card");
  await page.getByRole("button", { name: /Delete card/u }).click();
  await page.waitForURL(/\/$/u);
  await createCard(page, false);
  await expect(page.getByRole("img", { name: /QR code/u })).toBeVisible();
  await page
    .getByRole("article", { name: "Business card preview" })
    .screenshot({ path: shot("08-card-initials") });
}

test("capture UI review screenshots", async ({ page }, testInfo) => {
  mkdirSync(DIR, { recursive: true });
  const shot = (name: string): string => `${DIR}/${testInfo.project.name}-${name}.png`;
  await captureLanding(page, shot);
  await captureValidationErrors(page, shot);
  await captureEditorAndCard(page, shot);
  await captureRecipient(page, shot);
  await captureInitialsCard(page, shot);
});
