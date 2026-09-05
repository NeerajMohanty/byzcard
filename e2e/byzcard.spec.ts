/**
 * End-to-end browser verification of the complete Byzcard flow.
 * Runs against a production build (see playwright.config.ts) with test
 * Wallet fixtures configured, across phone / large-phone / desktop
 * viewports. Console errors and page errors fail the tests.
 */
import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { createCard, fillCardForm, makeConsoleGuard, TEST_CARD } from "./helpers";

const guard = makeConsoleGuard();

test.beforeEach(({ page }) => {
  guard.reset();
  guard.watch(page);
});

test.afterEach(() => {
  guard.assertClean();
});

test("landing page renders the pitch and a real example card", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: /Your next introduction/u }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Create my card" }).first()).toBeVisible();
  // Example card renders with a locally generated QR.
  await expect(page.getByRole("heading", { name: /^John\s*\(he\/him\)$/u }).first()).toBeVisible();
  await expect(page.getByRole("img", { name: /QR code/u }).first()).toBeVisible();
  await expect(page.getByText("They don’t need Byzcard installed.")).toBeVisible();
});

test("create → live preview → save → persist across reload → edit", async ({ page }) => {
  await page.goto("/create");
  // Live preview updates while typing.
  await page.getByLabel("Full name").fill("Ada Lovelace");
  await expect(page.getByRole("heading", { name: "Ada Lovelace" })).toBeVisible();

  await createCard(page);
  await expect(page.getByRole("heading", { name: "Ada Lovelace" })).toBeVisible();
  await expect(page.getByAltText("Photo of Ada Lovelace").first()).toBeVisible();
  await expect(page.getByRole("img", { name: /QR code/u })).toBeVisible();

  // Persistence across reload.
  await page.reload();
  await expect(page.getByRole("heading", { name: "Ada Lovelace" })).toBeVisible();
  await expect(page.getByAltText("Photo of Ada Lovelace").first()).toBeVisible();

  // Edit and persist again. Editing an existing card offers "Save changes"
  // (creation keeps "Save card") and reuses the same stored record.
  await page.getByRole("link", { name: "Edit card" }).click();
  await expect(page.getByRole("heading", { name: "Edit your card" })).toBeVisible();
  await expect(page.getByLabel("Full name")).toHaveValue("Ada Lovelace");
  await page.getByLabel("Role / title").fill("Director of Research");
  await page.getByRole("button", { name: "Save changes" }).click();
  await page.waitForURL("**/card");
  await page.reload();
  // Scope to the visible card — the hidden print sheet repeats the role.
  const edited = page.getByRole("article", { name: "Business card preview" });
  await expect(edited.getByText("Director of Research")).toBeVisible();
  // Untouched fields and the photo survive the edit.
  await expect(edited.getByRole("heading", { name: "Ada Lovelace" })).toBeVisible();
  await expect(page.getByAltText("Photo of Ada Lovelace").first()).toBeVisible();
});

test("QR share URL opens the recipient card with no photo fetch and no card request", async ({
  page,
  context,
}) => {
  await createCard(page);
  const shareUrl = await page.locator("[data-share-url]").getAttribute("data-share-url");
  expect(shareUrl).not.toBeNull();
  expect(shareUrl).toContain("/s#");
  expect(shareUrl?.indexOf("#")).toBeGreaterThan(0);

  // Open in a fresh page and record every request: the fragment must never
  // be sent, and no image may be fetched.
  const recipient = await context.newPage();
  guard.watch(recipient);
  const requests: string[] = [];
  recipient.on("request", (request) => requests.push(request.url()));
  await recipient.goto(shareUrl ?? "");

  await expect(recipient.getByRole("heading", { name: "Ada Lovelace" })).toBeVisible();
  await expect(recipient.getByText("Chief Analyst")).toBeVisible();
  await expect(recipient.getByText("Analytical Engines")).toBeVisible();
  await expect(recipient.getByText("+1 647 000 0000")).toBeVisible();
  await expect(recipient.getByRole("button", { name: "Save contact" })).toBeVisible();
  // Initials avatar, never a photo element.
  await expect(recipient.getByText("AL", { exact: true })).toBeVisible();
  expect(await recipient.locator("img").count()).toBe(0);

  for (const url of requests) {
    expect(url, "fragment must never reach the network").not.toContain("#");
    expect(url).not.toMatch(/\.(jpe?g|webp)(\?|$)/u);
  }

  // Save contact downloads a .vcf generated locally.
  const downloadPromise = recipient.waitForEvent("download");
  await recipient.getByRole("button", { name: "Save contact" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("ada-lovelace.vcf");
  const path = await download.path();
  const vcf = readFileSync(path, "utf8");
  expect(vcf).toContain("BEGIN:VCARD");
  expect(vcf).toContain("FN:Ada Lovelace");
  expect(vcf).not.toContain("PHOTO"); // photo never travels in the link
  await recipient.close();
});

test("optional profile fields flow end to end (card, QR payload, recipient)", async ({
  page,
  context,
}) => {
  await page.goto("/create");
  await fillCardForm(page, false);
  await page.getByLabel("Preferred name (optional)").fill("Ada");
  await page.getByLabel("Pronouns (optional)").selectOption("custom");
  await page.getByLabel("Your pronouns").fill("ze/zir");
  await page.getByLabel("Headline (optional)").fill("Analytical Engines · Pioneer");
  await page.getByText("Links", { exact: true }).click();
  await page.getByRole("button", { name: "+ Add link" }).click();
  await page.getByLabel("Links 1 URL").fill("github.com/ada");
  await page.getByRole("button", { name: "Save card" }).click();
  await page.waitForURL("**/card");

  const article = page.getByRole("article", { name: "Business card preview" });
  await expect(article.getByRole("heading", { level: 2 })).toContainText("Ada");
  await expect(article.getByText("(ze/zir)")).toBeVisible();
  await expect(article.getByText("Analytical Engines · Pioneer")).toBeVisible();
  await expect(article.getByText("GitHub")).toBeVisible();

  const shareUrl = await page.locator("[data-share-url]").getAttribute("data-share-url");
  expect(shareUrl).not.toBeNull();
  const recipient = await context.newPage();
  guard.watch(recipient);
  await recipient.goto(shareUrl ?? "");
  await expect(recipient.getByRole("heading", { name: /Ada/u })).toBeVisible();
  await expect(recipient.getByText("(ze/zir)")).toBeVisible();
  await expect(recipient.getByText("Analytical Engines · Pioneer")).toBeVisible();
  const github = recipient.getByRole("link", { name: "GitHub" });
  await expect(github).toBeVisible();
  expect(await github.getAttribute("href")).toBe("https://github.com/ada");
  await recipient.close();
});

test("recipient page shows a clear error for a damaged link", async ({ page }) => {
  await page.goto("/s#pBROKENPAYLOAD");
  await expect(page.getByText(/damaged or incomplete/u)).toBeVisible();
});

test("export backup, delete local data, then import restores card and photo", async ({ page }) => {
  await createCard(page);
  await page.getByText("Backup & restore").click();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /Export card/u }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("ada-lovelace.byzcard");
  const backupPath = await download.path();
  const backup = JSON.parse(readFileSync(backupPath, "utf8")) as {
    format: string;
    card: { fullName: string };
    photo?: { dataBase64: string };
  };
  expect(backup.format).toBe("byzcard-backup");
  expect(backup.card.fullName).toBe("Ada Lovelace");
  expect(backup.photo?.dataBase64.length ?? 0).toBeGreaterThan(100);

  // Delete everything locally.
  page.on("dialog", (dialog) => void dialog.accept());
  await page.getByRole("button", { name: /Delete card/u }).click();
  await page.waitForURL(/\/$/u);
  await page.goto("/card");
  await page.waitForURL("**/create"); // no card → redirected

  // Import from the editor (fresh-device path).
  await page.getByLabel("Import a .byzcard backup file").setInputFiles(backupPath);
  await page.waitForURL("**/card");
  await expect(page.getByRole("heading", { name: "Ada Lovelace" })).toBeVisible();
  await expect(page.getByAltText("Photo of Ada Lovelace").first()).toBeVisible();
});

test("wallet buttons appear when configured and produce signed artifacts", async ({
  page,
  browserName,
  isMobile,
}) => {
  test.skip(isMobile, "wallet platform gating differs per device; tested on desktop");
  expect(browserName).toBe("chromium");
  await createCard(page);

  // Wallet lives in a collapsed disclosure; expand it first.
  await page.getByText("Add to Wallet").click();

  // Desktop (neither iOS nor Android) shows both configured wallets.
  const appleButton = page.getByRole("button", { name: "Add to Apple Wallet" });
  const googleButton = page.getByRole("button", { name: "Add to Google Wallet" });
  await expect(appleButton).toBeVisible();
  await expect(googleButton).toBeVisible();

  // Apple: endpoint returns a signed .pkpass.
  const appleResponse = page.waitForResponse("**/api/apple-pass");
  await appleButton.click();
  const applePass = await appleResponse;
  expect(applePass.status()).toBe(200);
  expect(applePass.headers()["content-type"]).toBe("application/vnd.apple.pkpass");
  expect(applePass.headers()["cache-control"]).toBe("no-store");
  expect(applePass.headers()["cache-control"]).toBe("no-store");
  // (Signed pass bytes are validated in the unit suite; the blob navigation
  // that follows the click discards the response body here.)

  // Google: endpoint returns a save URL (external navigation stubbed).
  await page.goto("/card");
  await page.getByText("Add to Wallet").click();
  await page.route("https://pay.google.com/**", (route) =>
    route.fulfill({ status: 200, contentType: "text/html", body: "<title>stub</title>" }),
  );
  const googleResponse = page.waitForResponse("**/api/google-pass");
  await page.getByRole("button", { name: "Add to Google Wallet" }).click();
  const googleSave = await googleResponse;
  expect(googleSave.status()).toBe(200);
  expect(googleSave.headers()["cache-control"]).toBe("no-store");
  // The client navigates to the returned save URL (stubbed above) — the
  // navigation itself proves the signed URL round-trip; JWT content is
  // validated in the unit suite.
  await page.waitForURL(/pay.google.com/u);
});

test("wallet section reports unconfigured state honestly", async ({ page, browserName }) => {
  test.skip(
    browserName === "webkit",
    "Playwright WebKit cannot intercept requests on service-worker-controlled pages; " +
      "this UI state is engine-independent and fully covered on Chromium",
  );
  await page.route("**/api/wallet-config", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "cache-control": "no-store" },
      body: JSON.stringify({ apple: false, google: false }),
    }),
  );
  await createCard(page, false);
  // Unconfigured deployments show no Wallet UI at all — no row, no
  // "not configured" apology. Anchor on a rendered disclosure first.
  await expect(page.getByText("Use an NFC tag?")).toBeVisible();
  await expect(page.getByText("Add to Wallet")).toHaveCount(0);
  await expect(page.getByText(/Wallet passes are not configured/u)).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Apple Wallet/u })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Google Wallet/u })).toHaveCount(0);
});

test("NFC disclosure is collapsed and honest on unsupported browsers", async ({ page }) => {
  await createCard(page, false);
  // Collapsed by default; the limitation note is concise once expanded.
  await expect(page.getByText(/NFC tag writing isn’t available/u)).toBeHidden();
  await page.getByText("Use an NFC tag?").click();
  // Chromium desktop/mobile-emulation has no NDEFReader.
  await expect(page.getByText(/NFC tag writing isn’t available/u)).toBeVisible();
  await expect(page.getByRole("button", { name: /Write to NFC tag/u })).toHaveCount(0);
});

test("secondary tools are collapsed until opened (print, backup)", async ({ page }) => {
  await createCard(page, false);
  await expect(page.getByText("Do you want to print this?")).toBeVisible();
  await expect(page.getByRole("button", { name: "Print / Save as PDF" })).toBeHidden();
  await page.getByText("Do you want to print this?").click();
  await expect(page.getByRole("button", { name: "Print / Save as PDF" })).toBeVisible();

  await expect(page.getByRole("button", { name: /Export card/u })).toBeHidden();
  await page.getByText("Backup & restore").click();
  await expect(page.getByRole("button", { name: /Export card/u })).toBeVisible();
  await expect(page.getByRole("button", { name: "Import card from backup" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Delete card/u })).toBeVisible();
});

test("service worker registers and precaches the shell (WebKit)", async ({ page, browserName }) => {
  test.skip(browserName !== "webkit", "covered implicitly by the Chromium offline test");
  await createCard(page);
  // Full offline reload cannot be automated reliably in Playwright's WebKit
  // driver (service-worker fetch handling under network emulation); the
  // honest WebKit check is that the worker activates and the shell is
  // cached. Real-device Safari offline behavior remains a manual gate.
  const cached = await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    for (let attempt = 0; attempt < 20; attempt++) {
      // Version-agnostic: the current byzcard-* cache, whatever its bump.
      const names = (await caches.keys()).filter((name) => name.startsWith("byzcard-"));
      for (const name of names) {
        const keys = await (await caches.open(name)).keys();
        if (keys.length > 0) return keys.map((request) => new URL(request.url).pathname);
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    return [];
  });
  expect(cached).toContain("/");
  expect(cached).toContain("/card");
});

test("saved card persists across reload and a fresh /card navigation", async ({ page }) => {
  await createCard(page);
  await page.reload();
  const article = page.getByRole("article", { name: "Business card preview" });
  await expect(article.getByText(TEST_CARD.fullName)).toBeVisible();
  await page.goto("/card");
  await expect(article.getByText(TEST_CARD.fullName)).toBeVisible();
});

test("Adjust photo: drag and zoom reframe the portrait and survive reload", async ({ page }) => {
  await page.goto("/create");
  await fillCardForm(page);

  await page.getByRole("button", { name: "Adjust photo" }).click();
  const dialog = page.getByRole("dialog", { name: "Adjust photo" });
  await expect(dialog).toBeVisible();

  // Zoom twice via the accessible buttons (1 → 1.3225), then drag right.
  await dialog.getByRole("button", { name: "Zoom in" }).click();
  await dialog.getByRole("button", { name: "Zoom in" }).click();
  const stage = page.getByTestId("photo-adjust-stage");
  const box = await stage.boundingBox();
  expect(box).not.toBeNull();
  if (box !== null) {
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + 40, cy, { steps: 4 });
    await page.mouse.up();
  }
  await dialog.getByRole("button", { name: "Done" }).click();
  await expect(dialog).toHaveCount(0);

  await page.getByRole("button", { name: "Save card" }).click();
  await page.waitForURL("**/card");
  const img = page
    .getByRole("article", { name: "Business card preview" })
    .getByAltText(`Photo of ${TEST_CARD.fullName}`);
  const layoutOf = (): Promise<{ width: string; left: string }> =>
    img.evaluate((el) => ({ width: el.style.width, left: el.style.left }));
  await expect(img).toBeVisible();
  const saved = await layoutOf();
  // Square test photo at zoom 1.3225: cover width 1.25 × 1.3225 ≈ 165.3%.
  expect(parseFloat(saved.width)).toBeGreaterThan(160);
  expect(parseFloat(saved.width)).toBeLessThan(170);
  // The drag panned horizontally away from dead center.
  expect(parseFloat(saved.left)).not.toBeCloseTo((100 - parseFloat(saved.width)) / 2, 1);

  await page.reload();
  await expect(img).toBeVisible();
  expect(await layoutOf()).toEqual(saved);
});

test("Save card opens zero popups across 20 cycles and shows no debug copy", async ({
  page,
  context,
  browserName,
  isMobile,
}) => {
  test.skip(browserName !== "chromium" || isMobile, "repeated-cycle stress runs once, on desktop");
  test.slow();
  let newContexts = 0;
  context.on("page", () => {
    newContexts += 1;
  });
  page.on("popup", () => {
    newContexts += 1;
  });

  // Cycle 1: full create with photo + adjust.
  await page.goto("/create");
  await fillCardForm(page);
  await page.getByRole("button", { name: "Adjust photo" }).click();
  await page
    .getByRole("dialog", { name: "Adjust photo" })
    .getByRole("button", { name: "Zoom in" })
    .click();
  await page.getByRole("button", { name: "Done" }).click();
  await page.getByRole("button", { name: "Save card" }).click();
  await page.waitForURL("**/card");

  // The byte-count diagnostic never renders, but the share URL marker stays.
  const bodyText = await page.locator("body").innerText();
  expect(bodyText).not.toMatch(/Share link:|scans reliably|\d+ bytes/u);
  expect(await page.locator("[data-share-url]").getAttribute("data-share-url")).toContain("/s#");

  // Cycles 2–20: edit → save, staying in the same browsing context.
  for (let i = 0; i < 19; i++) {
    await page.getByRole("link", { name: "Edit card" }).click();
    await page.waitForURL("**/create");
    await page.getByLabel("Role / title").fill(`Role ${i}`);
    const save = page.getByRole("button", { name: "Save changes" });
    if (i === 5)
      await save.dblclick(); // double-click stress
    else await save.click();
    await page.waitForURL("**/card");
    await expect(page.getByRole("article", { name: "Business card preview" })).toBeVisible();
  }

  expect(newContexts, "Save must never open a popup, tab, or window").toBe(0);
  await expect(
    page.getByRole("article", { name: "Business card preview" }).getByText("Role 18"),
  ).toBeVisible();
});

test("core app works offline after first load (no PWA install)", async ({
  page,
  context,
  browserName,
}) => {
  test.skip(
    browserName === "webkit",
    "Playwright WebKit cannot reliably emulate offline through a service worker; " +
      "SW registration/caching is verified separately on WebKit and offline behavior on Chromium",
  );
  await createCard(page);
  // Ensure the service worker is active and has precached the shell.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.waitForTimeout(500);

  // Failed network fetches while offline are expected and logged by the
  // browser itself; everything else must stay clean.
  guard.allow.push(/Failed to load resource/u, /net::ERR/u, /Failed to fetch/u);
  await context.setOffline(true);
  await page.reload();

  // Card loads from IndexedDB through the cached shell.
  await expect(page.getByRole("heading", { name: "Ada Lovelace" })).toBeVisible();
  await expect(page.getByRole("img", { name: /QR code/u })).toBeVisible();
  // Wallet (which needs the network) simply is not offered offline.
  await expect(page.getByText("Use an NFC tag?")).toBeVisible();
  await expect(page.getByText("Add to Wallet")).toHaveCount(0);

  // Contact QR (vCard) still renders offline.
  await page.getByRole("button", { name: /Show contact QR/u }).click();
  await expect(page.getByRole("img", { name: /vCard/u })).toBeVisible();

  // Export still works offline (inside the Backup disclosure).
  await page.getByText("Backup & restore").click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /Export card/u }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("ada-lovelace.byzcard");

  await context.setOffline(false);
});
