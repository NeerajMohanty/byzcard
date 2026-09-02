/**
 * Marketing homepage E2E: navigation, CTAs, sections, responsiveness.
 * (GitHub-configured behavior is covered by unit tests; the E2E server
 * runs without NEXT_PUBLIC_GITHUB_URL, so links must be absent here.)
 */
import { expect, test } from "@playwright/test";
import { makeConsoleGuard } from "./helpers";

const guard = makeConsoleGuard();

test.beforeEach(({ page }) => {
  guard.reset();
  guard.watch(page);
});

test.afterEach(() => {
  guard.assertClean();
});

test("loads with hero, real example card and QR", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: /Your business card/u })).toBeVisible();
  await expect(page.getByText("Maya Castellanos").first()).toBeVisible();
  await expect(page.getByRole("img", { name: /QR code/u }).first()).toBeVisible();
  // No GitHub links without configuration.
  expect(await page.getByRole("link", { name: /GitHub/u }).count()).toBe(0);
});

test("hero CTA navigates to /create", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Create my card" }).first().click();
  await page.waitForURL("**/create");
  await expect(page.getByLabel("Full name")).toBeVisible();
});

test("navigation anchors reach their sections (desktop)", async ({ page, isMobile }) => {
  test.skip(isMobile, "section links are shown on wide viewports");
  await page.goto("/");
  for (const [label, id] of [
    ["How it works", "#how-it-works"],
    ["Ways to share", "#share"],
    ["Privacy", "#privacy"],
    ["Print", "#print"],
  ] as const) {
    await page.getByRole("navigation").getByRole("link", { name: label }).click();
    await expect(page.locator(id)).toBeInViewport();
  }
});

test("See how it works scrolls to the steps", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "See how it works" }).click();
  await expect(page.locator("#how-it-works")).toBeInViewport();
  await expect(page.getByRole("heading", { name: "Meet. Scan. Save." })).toBeVisible();
});

test("print and privacy sections are present with accurate content", async ({ page }) => {
  await page.goto("/");
  await page.locator("#print").scrollIntoViewIfNeeded();
  await expect(page.getByText("CR80 · 3.375 × 2.125 in")).toBeVisible();
  await expect(page.locator("#print").getByText("4 × 6 in", { exact: true })).toBeVisible();
  await page.locator("#privacy").scrollIntoViewIfNeeded();
  await expect(page.getByRole("heading", { name: "Your card belongs to you." })).toBeVisible();
  const bodyText = await page.locator("body").innerText();
  expect(bodyText).not.toMatch(/never leaves/iu);
});

test("mobile: no horizontal overflow, reachable CTAs, readable sections", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "phone-viewport checks");
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Create my card" }).first()).toBeVisible();

  // No horizontal overflow anywhere down the page.
  const overflow = await page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    return document.documentElement.scrollWidth - width;
  });
  expect(overflow).toBeLessThanOrEqual(1);

  // Hero card scales inside the viewport.
  const card = page.getByRole("article", { name: "Business card preview" }).first();
  await expect(card).toBeVisible();
  const box = await card.boundingBox();
  const viewport = page.viewportSize();
  expect((box?.width ?? 0) - (viewport?.width ?? 0)).toBeLessThanOrEqual(0);

  // Final CTA works.
  const finalCta = page.getByRole("link", { name: "Create my card" }).last();
  await finalCta.scrollIntoViewIfNeeded();
  await expect(finalCta).toBeVisible();
  await finalCta.click();
  await page.waitForURL("**/create");
});
