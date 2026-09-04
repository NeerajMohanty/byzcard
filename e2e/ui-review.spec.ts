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

const cardArticle = (page: Page) => page.getByRole("article", { name: "Business card preview" });

async function captureLanding(page: Page, shot: (name: string) => string): Promise<void> {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Create my card" }).first()).toBeVisible();
  await expect(page.getByRole("img", { name: /QR code/u }).first()).toBeVisible();
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
  await cardArticle(page).screenshot({ path: shot("04-live-preview-card") });

  await page.getByRole("button", { name: "Save card" }).click();
  await page.waitForURL("**/card");
  await expect(page.getByRole("img", { name: /QR code/u })).toBeVisible();
  await page.screenshot({ path: shot("05-card-screen"), fullPage: true });
  await cardArticle(page).screenshot({ path: shot("06-card-hero") });
}

async function captureRecipient(page: Page, shot: (name: string) => string): Promise<void> {
  const shareUrl = await page.locator("[data-share-url]").getAttribute("data-share-url");
  expect(shareUrl).not.toBeNull();
  await page.goto(shareUrl ?? "");
  await expect(page.getByRole("heading", { name: TEST_CARD.fullName })).toBeVisible();
  await page.screenshot({ path: shot("07-recipient"), fullPage: true });
  await page.goto("/card");
}

async function captureInstallUi(
  page: Page,
  shot: (name: string) => string,
  browserName: string,
): Promise<void> {
  const cta = page.getByRole("button", { name: "Add Byzcard to Home Screen" });
  await expect(cta).toBeVisible();
  if (browserName === "webkit") {
    // iPhone Safari: backup-first step, then the instruction sheet.
    await cta.click();
    const backup = page.getByRole("dialog", { name: "Save a backup first" });
    await expect(backup).toBeVisible();
    await page.screenshot({ path: shot("09-ios-backup-first") });
    await backup.getByRole("button", { name: "Continue without backup" }).click();
    const sheet = page.getByRole("dialog", { name: /Add Byzcard to your Home Screen/u });
    await expect(sheet).toBeVisible();
    await page.screenshot({ path: shot("09b-ios-install-sheet") });
    await sheet.getByRole("button", { name: "Got it" }).click();
  } else {
    // Chromium: the install CTA block.
    await cta.scrollIntoViewIfNeeded();
    await page.screenshot({ path: shot("09-install-cta") });
  }
}

async function capturePrintPreviews(page: Page, shot: (name: string) => string): Promise<void> {
  // Print controls live in a collapsed disclosure on the card screen.
  await page.getByText("Do you want to print this?").click();
  await page.emulateMedia({ media: "print" });
  await expect(page.locator("[data-print-format='cr80']")).toBeVisible();
  await page.locator("[data-print-format='cr80']").screenshot({ path: shot("10-print-cr80") });
  await page.emulateMedia({ media: "screen" });
  await page.getByRole("radio", { name: /Event Badge/u }).check();
  await page.emulateMedia({ media: "print" });
  await expect(page.locator("[data-print-format='badge']")).toBeVisible();
  await page.locator("[data-print-format='badge']").screenshot({ path: shot("11-print-badge") });
  await page.emulateMedia({ media: "screen" });
}

async function captureVariants(page: Page, shot: (name: string) => string): Promise<void> {
  page.on("dialog", (dialog) => void dialog.accept());
  // Initials (no photo) variant. Delete lives inside the Backup disclosure.
  await page.goto("/card");
  await page.getByText("Backup & restore").click();
  await page.getByRole("button", { name: /Delete card/u }).click();
  await page.waitForURL(/\/$/u);
  await createCard(page, false);
  await expect(page.getByRole("img", { name: /QR code/u })).toBeVisible();
  await cardArticle(page).screenshot({ path: shot("08-card-initials") });
  // Blank-website variant (photo, no website → WEBSITE + em dash).
  await page.getByText("Backup & restore").click();
  await page.getByRole("button", { name: /Delete card/u }).click();
  await page.waitForURL(/\/$/u);
  await createCard(page, true, false);
  await expect(cardArticle(page).getByText("—")).toBeVisible();
  await cardArticle(page).screenshot({ path: shot("12-card-hero-no-website") });
}

test("capture UI review screenshots", async ({ page, browserName }, testInfo) => {
  test.slow(); // full-app screenshot tour; WebKit runs close to the base limit
  mkdirSync(DIR, { recursive: true });
  const shot = (name: string): string => `${DIR}/${testInfo.project.name}-${name}.png`;
  await captureLanding(page, shot);
  await captureValidationErrors(page, shot);
  await captureEditorAndCard(page, shot);
  await captureRecipient(page, shot);
  await captureInstallUi(page, shot, browserName);
  await capturePrintPreviews(page, shot);
  await captureVariants(page, shot);
});
