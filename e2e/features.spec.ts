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

test("owner card: circular photo, and a blank website hides the row (no dash)", async ({
  page,
  context,
}) => {
  await createCard(page, true, false); // photo yes, website no
  const photo = page.getByAltText(`Photo of ${TEST_CARD.fullName}`).first();
  await expect(photo).toBeVisible();
  // Circular frame around the stored 4:5 crop window (the img keeps the crop layout).
  const frame = await photo.evaluate((el) => {
    const ring = el.parentElement?.parentElement;
    return {
      width: ring?.style.width,
      height: ring?.style.height,
      radius: ring?.style.borderRadius,
    };
  });
  expect(frame).toEqual({ width: "104px", height: "104px", radius: "50%" });

  // No Website row and no filler dash anywhere in the card.
  const cardArticle = page.getByRole("article", { name: "Business card preview" });
  expect(await cardArticle.getByText("Website").count()).toBe(0);
  expect(await cardArticle.getByText("—").count()).toBe(0);
  // The card carries the profile section only — no Quick Access shell for zero links.
  await expect(cardArticle.locator("[data-part='profile']")).toBeVisible();
  expect(await cardArticle.locator("[data-part='quick']").count()).toBe(0);

  // Nothing leaks: share URL decodes without a website, and the recipient
  // card shows no Website row or action either.
  const shareUrl = await page.locator("[data-share-url]").getAttribute("data-share-url");
  expect(shareUrl).not.toBeNull();
  expect(shareUrl).not.toContain(encodeURIComponent("—"));
  const recipient = await context.newPage();
  guard.watch(recipient);
  await recipient.goto(shareUrl ?? "");
  await expect(recipient.getByRole("heading", { name: TEST_CARD.fullName })).toBeVisible();
  const recipientCard = recipient.getByRole("article");
  expect(await recipientCard.getByText("Website").count()).toBe(0);
  expect(await recipientCard.getByText("—").count()).toBe(0);
  expect(await recipient.getByRole("link", { name: "Website" }).count()).toBe(0);
  await recipient.close();
});

test("app screens show the Byzcard header and it navigates home", async ({ page }) => {
  await createCard(page);
  const brand = page.getByRole("banner").getByRole("link", { name: "Byzcard" });
  await expect(brand).toBeVisible();
  await brand.click();
  await page.waitForURL(/\/$/u);
  await expect(
    page.getByRole("heading", { level: 1, name: /Your next introduction/u }),
  ).toBeVisible();
  await page.goto("/create");
  await expect(page.getByRole("banner").getByRole("link", { name: "Byzcard" })).toBeVisible();
});

test("web app manifest is served with the Byzcard install contract", async ({ page }) => {
  const response = await page.request.get("/manifest.webmanifest");
  expect(response.ok()).toBe(true);
  const manifest = (await response.json()) as {
    name: string;
    short_name: string;
    start_url: string;
    scope: string;
    display: string;
    icons: { src: string }[];
  };
  expect(manifest.name).toBe("Byzcard");
  expect(manifest.short_name).toBe("Byzcard");
  expect(manifest.start_url).toBe("/card");
  expect(manifest.scope).toBe("/");
  expect(manifest.display).toBe("standalone");
  expect(manifest.icons.length).toBeGreaterThanOrEqual(3);
  for (const icon of manifest.icons) {
    const iconResponse = await page.request.get(icon.src);
    expect(iconResponse.ok(), icon.src).toBe(true);
  }
});

test("Home Screen install sits above Share and captures the native install prompt (Chromium)", async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== "chromium", "beforeinstallprompt is a Chromium API");
  await createCard(page);

  // Section hierarchy: Home Screen before Share before Print before Wallet.
  // (Anchor on a rendered heading first — the headings appear together once
  // the card loads from IndexedDB.)
  await expect(page.getByRole("heading", { name: "Home Screen" })).toBeVisible();
  const sections = await page.locator("h2").allTextContents();
  const quickIndex = sections.findIndex((s) => /home screen/iu.test(s));
  const shareIndex = sections.findIndex((s) => /^share$/iu.test(s.trim()));
  expect(quickIndex).toBeGreaterThanOrEqual(0);
  expect(shareIndex).toBeGreaterThan(quickIndex);
  // The install control is an app action, outside the ID card.
  const card = page.getByRole("article", { name: "Business card preview" });
  expect(await card.getByRole("button", { name: "Add Byzcard to Home Screen" }).count()).toBe(0);
  // Secondary tools are collapsed disclosure rows below Share, in order.
  await expect(page.locator("summary.disclosure-summary")).toHaveText([
    "Do you want to print this?",
    "Add to Wallet",
    "Use an NFC tag?",
    "Backup & restore",
  ]);

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
  await page.getByRole("button", { name: "Add Byzcard to Home Screen" }).click();
  await expect(page.getByText(/opens from your Home Screen/u)).toBeVisible();
  const prompted = await page.evaluate(() => {
    const w: Window & { __installMarker?: { prompted: boolean } } = window;
    return w.__installMarker?.prompted === true;
  });
  expect(prompted).toBe(true);
});

test("iOS path: backup-first download, then concise install instructions (WebKit)", async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== "webkit", "iPhone Safari instruction path");
  await createCard(page);
  await page.getByRole("button", { name: "Add Byzcard to Home Screen" }).click();

  // Step 1: a predictable backup download with the exact filename shown.
  const backup = page.getByRole("dialog", { name: "Save a backup first" });
  await expect(backup).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await backup.getByRole("button", { name: "Download backup" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("ada-lovelace.byzcard");
  await expect(backup.getByText(/Backup ready — file: ada-lovelace\.byzcard/u)).toBeVisible();
  await backup.getByRole("button", { name: "Continue to Home Screen instructions" }).click();

  // Step 2: clean instructions — no technical storage paragraph.
  const sheet = page.getByRole("dialog", { name: /Add Byzcard to your Home Screen/u });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByText(/Share button in your browser/u)).toBeVisible();
  await expect(sheet.getByText(/its own storage/u)).toHaveCount(0);
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
  // The standalone launch reads the same local storage: the saved card
  // renders — this is the Home-Screen persistence contract where the
  // platform shares storage (Android/Chromium).
  await expect(page.getByRole("article", { name: "Business card preview" })).toBeVisible();
  await expect(page.getByText(/opens from your Home Screen/u)).toBeVisible();
  await expect(page.getByRole("button", { name: "Add Byzcard to Home Screen" })).toHaveCount(0);
});

test("print: two formats, exact physical layouts, screen UI hidden in print media", async ({
  page,
}) => {
  await createCard(page);
  // Print now lives in a collapsed disclosure; open it first.
  await page.getByText("Do you want to print this?").click();
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
  await expect(page.getByRole("button", { name: "Add Byzcard to Home Screen" })).toBeHidden();
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
