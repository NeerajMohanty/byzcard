/**
 * Landing-page visual review screenshots (gitignored artifacts/ui-review).
 * Phone projects capture each section; desktop captures hero/middle/footer;
 * full-page shots on mobile WebKit and desktop Chromium.
 */
import { mkdirSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const DIR = "artifacts/ui-review";

/**
 * Full-page captures are rasterized at CSS scale. The landing page is
 * ~11.5k CSS px tall on phones; at the iPhone's 3× device scale that is
 * ~34.6k device px, past WebKit's 32767 px screenshot ceiling.
 */
const FULL_PAGE = { fullPage: true, scale: "css" } as const;

const SECTIONS = [
  ["02-landing-how-it-works", "#how-it-works"],
  ["03-landing-share", "#share"],
  ["04-landing-privacy", "#privacy"],
  ["05-landing-print", "#print"],
  ["06-landing-open-source", "#open-source"],
] as const;

async function openLanding(page: Page): Promise<void> {
  await page.goto("/");
  await expect(page.getByRole("img", { name: /QR code/u }).first()).toBeVisible();
}

test("capture landing screenshots (phone)", async ({ page, isMobile }, testInfo) => {
  test.skip(!isMobile, "phone set");
  mkdirSync(DIR, { recursive: true });
  const shot = (name: string): string => `${DIR}/${testInfo.project.name}-${name}.png`;
  await openLanding(page);
  await page.screenshot({ path: shot("01-landing-top") });
  for (const [name, id] of SECTIONS) {
    await page.locator(id).scrollIntoViewIfNeeded();
    await page.screenshot({ path: shot(name) });
  }
  const finalCta = page.getByRole("link", { name: "Create my card" }).last();
  await finalCta.scrollIntoViewIfNeeded();
  await page.screenshot({ path: shot("07-landing-final-cta") });
  if (testInfo.project.name === "mobile-webkit") {
    await page.screenshot({ path: shot("landing-full"), ...FULL_PAGE });
  }
});

test("capture landing screenshots (desktop)", async ({ page, isMobile }, testInfo) => {
  test.skip(isMobile, "desktop set");
  mkdirSync(DIR, { recursive: true });
  const shot = (name: string): string => `${DIR}/${testInfo.project.name}-${name}.png`;
  await openLanding(page);
  await page.screenshot({ path: shot("01-landing-hero-desktop") });
  await page.locator("#privacy").scrollIntoViewIfNeeded();
  await page.screenshot({ path: shot("02-landing-middle-desktop") });
  await page
    .getByRole("heading", { name: "Create your Byzcard in a minute." })
    .scrollIntoViewIfNeeded();
  await page.screenshot({ path: shot("04-landing-final-cta-desktop") });
  await page.getByRole("contentinfo").scrollIntoViewIfNeeded();
  await page.screenshot({ path: shot("03-landing-footer-desktop") });
  await page.screenshot({ path: shot("landing-full"), ...FULL_PAGE });
});
