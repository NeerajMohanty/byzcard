/**
 * Marketing homepage E2E: navigation, CTAs, sections, responsiveness.
 * (GitHub env overrides are covered by unit tests; the E2E server
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
  await expect(
    page.getByRole("heading", { level: 1, name: /Your next introduction/u }),
  ).toBeVisible();
  // Preferred name replaces the full name on the card, with pronouns beside it.
  await expect(page.getByRole("heading", { name: /^John\s*\(he\/him\)$/u }).first()).toBeVisible();
  await expect(page.getByText("Designing simple digital experiences").first()).toBeVisible();
  await expect(page.getByText("LinkedIn · WhatsApp · GitHub").first()).toBeVisible();
  await expect(page.getByRole("img", { name: /QR code/u }).first()).toBeVisible();
  // Exactly two GitHub links — Open Source and footer — both to the public repo.
  const githubLinks = page.getByRole("link", { name: /GitHub/u });
  await expect(githubLinks).toHaveCount(2);
  for (const link of await githubLinks.all()) {
    await expect(link).toHaveAttribute("href", "https://github.com/NeerajMohanty/byzcard");
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", "noopener noreferrer");
  }
});

test("nav shows the Byzcard lockup and the brand icon asset is served", async ({ page }) => {
  await page.goto("/");
  const brand = page.getByRole("navigation", { name: "Main" }).getByRole("link", {
    name: "Byzcard",
  });
  await expect(brand).toBeVisible();
  await expect(brand.locator("svg")).toBeVisible();
  const asset = await page.request.get("/brand/byzcard-b-logo.svg");
  expect(asset.status()).toBe(200);
  expect(await asset.text()).toContain('viewBox="0 0 280 280"');
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
    // Scoped to the main nav: the footer is a second navigation landmark.
    await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: label }).click();
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

/**
 * Every user-visible element of the Print section, checked after it was
 * moved inside the white feature card. Nothing may be dropped or condensed.
 */
test("print section keeps all of its content inside one feature card", async ({ page }) => {
  await page.goto("/");
  const print = page.locator("#print");
  await print.scrollIntoViewIfNeeded();

  await expect(print.getByText("Print", { exact: true })).toBeVisible();
  await expect(print.getByRole("heading", { name: /Digital when you want it/u })).toBeVisible();
  await expect(print.getByText(/Print your Byzcard directly from your browser/u)).toBeVisible();
  await expect(print.getByText("Standard ID Card", { exact: true })).toBeVisible();
  await expect(print.getByText("CR80 · 3.375 × 2.125 in")).toBeVisible();
  await expect(print.getByText("Wallet-sized.")).toBeVisible();
  await expect(print.getByText("Event Badge", { exact: true })).toBeVisible();
  await expect(print.getByText("4 × 6 in", { exact: true })).toBeVisible();
  await expect(print.getByText(/Designed for networking events/u)).toBeVisible();
  await expect(print.getByRole("link", { name: "Create a card to print" })).toBeVisible();
  await expect(print.getByText("Standard ID Card — CR80")).toBeVisible();
  await expect(print.getByText("Event Badge — 4 × 6 in")).toBeVisible();
  expect(await print.getByRole("img", { name: /QR code/u }).count()).toBe(2);

  // The whole section sits inside one rounded, light feature surface.
  const card = await print.locator("h2").evaluate((heading) => {
    let node = heading.parentElement;
    while (node !== null && node.id !== "print") {
      const cs = getComputedStyle(node);
      if (parseFloat(cs.borderTopLeftRadius) >= 20 && cs.backgroundImage !== "none") {
        return {
          radius: parseFloat(cs.borderTopLeftRadius),
          descendants: node.querySelectorAll("*").length,
        };
      }
      node = node.parentElement;
    }
    return null;
  });
  expect(card).not.toBeNull();
  // One card wrapping the whole feature, not a small box around the heading.
  expect(card?.descendants ?? 0).toBeGreaterThan(30);
});

test("FAQ accordion is keyboard operable and reports its state", async ({ page }) => {
  await page.goto("/");
  const faq = page.locator("#faq");
  await faq.scrollIntoViewIfNeeded();
  await expect(faq.getByRole("heading", { name: "Frequently asked." })).toBeVisible();
  const triggers = faq.locator("button[aria-expanded]");
  await expect(triggers).toHaveCount(8);

  const first = triggers.first();
  await expect(first).toHaveAttribute("aria-expanded", "false");
  // Keyboard: focus the control and toggle with Enter.
  await first.focus();
  await page.keyboard.press("Enter");
  await expect(first).toHaveAttribute("aria-expanded", "true");
  await expect(faq.getByText(/without signing up/u)).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(first).toHaveAttribute("aria-expanded", "false");

  // Only one panel open at a time.
  await triggers.nth(1).click();
  await triggers.nth(2).click();
  await expect(triggers.nth(1)).toHaveAttribute("aria-expanded", "false");
  await expect(triggers.nth(2)).toHaveAttribute("aria-expanded", "true");
});

test("footer carries the brand mark and only routes that exist", async ({ page }) => {
  await page.goto("/");
  const footer = page.getByRole("contentinfo");
  await footer.scrollIntoViewIfNeeded();
  for (const name of ["Create card", "How it works", "Ways to share", "Privacy", "Print"]) {
    await expect(footer.getByRole("link", { name })).toBeVisible();
  }
  // No invented destinations.
  for (const absent of ["Pricing", "Careers", "Blog", "Teams", "Enterprise", "Help center"]) {
    expect(await footer.getByRole("link", { name: absent }).count()).toBe(0);
  }
  // Exactly one brand lockup: the small duplicate was removed.
  expect(await footer.locator("svg").count()).toBe(1);

  // The ink sits on a rounded card inset from the page, not on the footer.
  const card = await footer.locator("svg").evaluate((svg) => {
    let node = svg.parentElement;
    while (node !== null && node.tagName !== "FOOTER") {
      const cs = getComputedStyle(node);
      if (parseFloat(cs.borderTopLeftRadius) >= 20 && cs.backgroundImage !== "none") {
        const box = node.getBoundingClientRect();
        return { radius: parseFloat(cs.borderTopLeftRadius), left: box.left, right: box.right };
      }
      node = node.parentElement;
    }
    return null;
  });
  expect(card).not.toBeNull();
  // Cream gutter on both sides — the card never reaches the viewport edges.
  expect(card?.left ?? 0).toBeGreaterThan(0);
  const viewport = page.viewportSize();
  expect(card?.right ?? 0).toBeLessThan(viewport?.width ?? 0);

  // The links sit below the brand signature, not beside it.
  const order = await footer.evaluate((el) => {
    const mark = el.querySelector("svg")?.closest("p")?.getBoundingClientRect().bottom ?? 0;
    const nav = el.querySelector("nav")?.getBoundingClientRect().top ?? 0;
    return { mark, nav };
  });
  expect(order.nav).toBeGreaterThanOrEqual(order.mark);
});

const SHARE_TITLES = [
  "Show your QR",
  "Keep it one tap away",
  "Straight into Contacts",
  "Take it offline",
  "Tap a physical tag",
  "Wallet, if you want it",
] as const;

test("ways to share is one seven-card stack holding every method", async ({ page }) => {
  await page.goto("/");
  const share = page.locator("#share");
  await share.scrollIntoViewIfNeeded();

  // Heading wording is untouched.
  await expect(share.getByRole("heading", { level: 2 })).toHaveText(
    "One card. Different ways to share it.",
  );

  // Six method cards plus the closing summary.
  await expect(share.locator("article")).toHaveCount(7);

  // Every method survives, and appears exactly twice: its own card and the
  // summary. A third occurrence would mean the old static grid still renders.
  for (const title of SHARE_TITLES) {
    expect(await share.getByText(title, { exact: true }).count()).toBe(2);
  }

  // The summary card carries all six.
  const summary = share.locator("article").last();
  await expect(
    summary.getByRole("heading", { name: "One card. Six ways to share." }),
  ).toBeVisible();
  for (const title of SHARE_TITLES) {
    await expect(summary.getByText(title, { exact: true })).toBeVisible();
  }

  // The cards are sticky layers of one deck, not a plain list.
  const sticky = await share
    .locator("article")
    .first()
    .evaluate((el) => getComputedStyle(el).position);
  expect(sticky).toBe("sticky");
});
