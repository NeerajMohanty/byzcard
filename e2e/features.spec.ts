/**
 * E2E for the V1 completion pass: enlarged card photo, optional website
 * with presentation-only em dash, Home Screen install flows, manifest,
 * and the two print formats (verified under real print media emulation).
 */
import { expect, test } from "@playwright/test";
import { createCard, makeConsoleGuard, TEST_CARD } from "./helpers";

const guard = makeConsoleGuard();

test.beforeEach(({ page }) => {
  guard.reset();
  guard.watch(page);
});

test.afterEach(() => {
  guard.assertClean();
});

test("owner card: 96px photo, and blank website renders a presentation-only em dash", async ({
  page,
  context,
}) => {
  await createCard(page, true, false); // photo yes, website no
  const photo = page.getByAltText(`Photo of ${TEST_CARD.fullName}`).first();
  await expect(photo).toBeVisible();
  expect(await photo.getAttribute("width")).toBe("96");

  // WEBSITE row present with em dash on the owner card (scoped to the
  // visible card — the hidden print sheet repeats these strings).
  const cardArticle = page.getByRole("article", { name: "Business card preview" });
  await expect(cardArticle.getByText("Website", { exact: true })).toBeVisible();
  await expect(cardArticle.getByText("—", { exact: true })).toBeVisible();

  // The em dash never leaks: share URL decodes without a website, and the
  // recipient page shows no Website row or action.
  const shareUrl = await page.locator("[data-share-url]").getAttribute("data-share-url");
  expect(shareUrl).not.toBeNull();
  expect(shareUrl).not.toContain(encodeURIComponent("—"));
  const recipient = await context.newPage();
  guard.watch(recipient);
  await recipient.goto(shareUrl ?? "");
  await expect(recipient.getByRole("heading", { name: TEST_CARD.fullName })).toBeVisible();
  // No Website row/action and no em dash inside the recipient card itself
  // (the page footer prose legitimately contains an em dash).
  const recipientCard = recipient.getByRole("article");
  expect(await recipientCard.getByText("Website").count()).toBe(0);
  expect(await recipientCard.getByText("—").count()).toBe(0);
  expect(await recipient.getByRole("link", { name: "Website" }).count()).toBe(0);
  await recipient.close();
});

test("web app manifest is served with the BYZCARD install contract", async ({ page }) => {
  const response = await page.request.get("/manifest.webmanifest");
  expect(response.ok()).toBe(true);
  const manifest = (await response.json()) as {
    name: string;
    start_url: string;
    display: string;
    icons: { src: string }[];
  };
  expect(manifest.name).toBe("BYZCARD");
  expect(manifest.start_url).toBe("/card");
  expect(manifest.display).toBe("standalone");
  for (const icon of manifest.icons) {
    const iconResponse = await page.request.get(icon.src);
    expect(iconResponse.ok(), icon.src).toBe(true);
  }
});

test("Quick Access sits above Wallet and captures the native install prompt (Chromium)", async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== "chromium", "beforeinstallprompt is a Chromium API");
  await createCard(page);

  // Section hierarchy: Quick access before Share before Print before Wallet.
  // (Anchor on a rendered heading first — the headings appear together once
  // the card loads from IndexedDB.)
  await expect(page.getByRole("heading", { name: "Quick access" })).toBeVisible();
  const sections = await page.locator("h2").allTextContents();
  const order = ["Quick access", "Share", "Print", "Wallet"].map((name) =>
    sections.findIndex((s) => s.toLowerCase() === name.toLowerCase()),
  );
  expect(order.every((index) => index >= 0)).toBe(true);
  expect([...order]).toEqual([...order].sort((a, b) => a - b));

  // Synthesize the Chromium install prompt event with a stubbed prompt().
  await page.evaluate(() => {
    const marker: { prompted: boolean } = { prompted: false };
    Object.assign(window, { __installMarker: marker });
    const event = Object.assign(new Event("beforeinstallprompt", { cancelable: true }), {
      prompt: () => {
        marker.prompted = true;
        return Promise.resolve();
      },
      userChoice: Promise.resolve({ outcome: "accepted" }),
    });
    window.dispatchEvent(event);
  });
  await page.getByRole("button", { name: "Add BYZCARD to Home Screen" }).click();
  await expect(page.getByText(/opens from your Home Screen/u)).toBeVisible();
  const prompted = await page.evaluate(() => {
    const w: Window & { __installMarker?: { prompted: boolean } } = window;
    return w.__installMarker?.prompted === true;
  });
  expect(prompted).toBe(true);
});

test("iOS Safari path shows manual Add-to-Home-Screen instructions (WebKit)", async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== "webkit", "iPhone Safari instruction path");
  await createCard(page);
  await page.getByRole("button", { name: "Add BYZCARD to Home Screen" }).click();
  const sheet = page.getByRole("dialog", { name: /Add BYZCARD to your Home Screen/u });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByText(/Share button in Safari/u)).toBeVisible();
  await expect(sheet.getByText(/Add to Home Screen/u)).toBeVisible();
  await sheet.getByRole("button", { name: "Got it" }).click();
  await expect(sheet).toHaveCount(0);
});

test("standalone display-mode shows the installed state instead of the CTA", async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== "chromium", "display-mode emulated via matchMedia override");
  await page.addInitScript(() => {
    const original = window.matchMedia.bind(window);
    window.matchMedia = (query: string): MediaQueryList => {
      const real = original(query);
      if (query !== "(display-mode: standalone)") return real;
      // Proxy keeps every native method while overriding matches.
      return new Proxy(real, {
        get: (target, key) => (key === "matches" ? true : Reflect.get(target, key)),
      });
    };
  });
  await createCard(page);
  await expect(page.getByText(/opens from your Home Screen/u)).toBeVisible();
  await expect(page.getByRole("button", { name: "Add BYZCARD to Home Screen" })).toHaveCount(0);
});

test("print: two formats, exact physical layouts, screen UI hidden in print media", async ({
  page,
}) => {
  await createCard(page);
  await expect(page.getByRole("radio", { name: /Standard ID Card/u })).toBeChecked();
  expect(await page.getByRole("radio").count()).toBe(2);

  // window.print() is invoked by the action (stubbed to avoid system UI).
  await page.evaluate(() => {
    Object.assign(window, { __printed: false });
    window.print = () => {
      Object.assign(window, { __printed: true });
    };
  });
  await page.getByRole("button", { name: "Print / Save as PDF" }).click();
  const printed = await page.evaluate(() => {
    const w: Window & { __printed?: boolean } = window;
    return w.__printed === true;
  });
  expect(printed).toBe(true);

  // CR80 under real print media: exact physical size (1in = 96 CSS px).
  await page.emulateMedia({ media: "print" });
  const cr80 = page.locator("[data-print-format='cr80']");
  await expect(cr80).toBeVisible();
  const cr80Box = await cr80.boundingBox();
  expect(Math.round(cr80Box?.width ?? 0)).toBe(324); // 3.375in
  expect(Math.round(cr80Box?.height ?? 0)).toBe(204); // 2.125in
  await expect(page.getByRole("button", { name: "Print / Save as PDF" })).toBeHidden();
  await expect(page.getByRole("button", { name: "Add BYZCARD to Home Screen" })).toBeHidden();
  // QR square with intact quiet-zone tile.
  const qrTile = cr80.locator("[role='img']");
  const qrBox = await qrTile.boundingBox();
  expect(Math.abs((qrBox?.width ?? 0) - (qrBox?.height ?? 1))).toBeLessThan(1.5);

  // Switch to the badge and verify 4 × 6 portrait.
  await page.emulateMedia({ media: "screen" });
  await page.getByRole("radio", { name: /Event Badge/u }).check();
  await page.emulateMedia({ media: "print" });
  const badge = page.locator("[data-print-format='badge']");
  await expect(badge).toBeVisible();
  const badgeBox = await badge.boundingBox();
  expect(Math.round(badgeBox?.width ?? 0)).toBe(384); // 4in
  expect(Math.round(badgeBox?.height ?? 0)).toBe(576); // 6in
  await expect(badge.getByText("Scan to connect")).toBeVisible();
  const badgeQr = await badge.locator("[role='img']").boundingBox();
  expect(Math.abs((badgeQr?.width ?? 0) - (badgeQr?.height ?? 1))).toBeLessThan(1.5);
  await expect(page.locator("[data-print-format='cr80']")).toHaveCount(0);
});
