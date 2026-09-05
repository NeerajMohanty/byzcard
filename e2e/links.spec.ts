/**
 * Optional links end to end: an existing card gains LinkedIn, a social
 * entry, GitHub and a custom link through Edit → Save changes; they appear
 * as tappable Quick Access actions below the card, open the exact
 * destination, and survive a reload.
 */
import { expect, test } from "@playwright/test";
import { createCard, makeConsoleGuard } from "./helpers";

const guard = makeConsoleGuard();

test.beforeEach(({ page }) => {
  guard.reset();
  guard.watch(page);
});

test.afterEach(() => {
  guard.assertClean();
});

test("optional links: edit an existing card, then Quick Access shows tappable links that persist", async ({
  page,
  context,
}) => {
  await createCard(page, false);
  const article = page.getByRole("article", { name: "Business card preview" });
  // A card without optional links carries no Quick Access section at all.
  await expect(article.locator("[data-part='profile']")).toBeVisible();
  await expect(article.getByRole("region", { name: "Quick Access" })).toHaveCount(0);

  // Existing card → Edit → add LinkedIn (dedicated field), a social entry,
  // GitHub and a custom link → Save changes.
  await page.getByRole("link", { name: "Edit card" }).click();
  await expect(page.getByRole("heading", { name: "Edit your card" })).toBeVisible();
  await page.getByLabel("LinkedIn (optional)").fill("linkedin.com/in/neerajmohanty");
  await page.getByText("Social", { exact: true }).click();
  await page.getByRole("button", { name: "+ Add social" }).click();
  await page.getByLabel("Social 1 service").selectOption("instagram");
  await page.getByLabel("Social 1 URL").fill("instagram.com/ada.codes");
  await page.getByText("Links", { exact: true }).click();
  await page.getByRole("button", { name: "+ Add link" }).click();
  await page.getByLabel("Links 1 URL").fill("github.com/ada");
  await page.getByRole("button", { name: "+ Add link" }).click();
  await page.getByLabel("Links 2 service").selectOption("custom");
  await page.getByLabel("Links 2 URL").fill("https://ada.example.org/portfolio");
  await page.getByRole("button", { name: "Save changes" }).click();
  await page.waitForURL("**/card");

  const expected = [
    ["LinkedIn", "https://linkedin.com/in/neerajmohanty"],
    ["Instagram", "https://instagram.com/ada.codes"],
    ["GitHub", "https://github.com/ada"],
    ["ada.example.org", "https://ada.example.org/portfolio"],
  ] as const;
  // Quick Access is a section of the ID card itself.
  const quick = article.getByRole("region", { name: "Quick Access" });
  await expect(quick).toBeVisible();
  await expect(quick.getByRole("link")).toHaveCount(expected.length);
  for (const [name, href] of expected) {
    const link = quick.getByRole("link", { name, exact: true });
    await expect(link).toBeVisible();
    expect(await link.getAttribute("href")).toBe(href);
    expect(await link.getAttribute("target")).toBe("_blank");
    expect(await link.getAttribute("rel")).toBe("noopener noreferrer");
  }
  // Labels only, never raw URLs; and no app controls inside the card.
  expect(await article.getByText(/https?:\/\//u).count()).toBe(0);
  expect(await article.getByText(/linkedin\.com|github\.com/u).count()).toBe(0);
  expect(await article.getByRole("button").count()).toBe(0);
  expect(await article.locator("[data-part='profile']").getByText(" · ").count()).toBe(0);

  // Tapping opens exactly the destination in a new page. External hosts are
  // stubbed at the network layer so nothing leaves the test environment.
  await context.route(
    /^https:\/\/(linkedin\.com|instagram\.com|github\.com|ada\.example\.org)\//u,
    (route) =>
      route.fulfill({ status: 200, contentType: "text/html", body: "<title>stub</title>" }),
  );
  for (const [name, href] of expected) {
    const popupPromise = context.waitForEvent("page");
    await quick.getByRole("link", { name, exact: true }).click();
    const popup = await popupPromise;
    await popup.waitForLoadState();
    expect(popup.url()).toBe(href);
    await popup.close();
  }

  // Reload: everything is still there, and the editor shows the saved values.
  await page.reload();
  await expect(quick.getByRole("link")).toHaveCount(expected.length);
  expect(await quick.getByRole("link", { name: "LinkedIn" }).getAttribute("href")).toBe(
    "https://linkedin.com/in/neerajmohanty",
  );
  // The printed sheets are the same complete ID card: profile + Quick Access
  // as plain labels, at the exact physical size, with no app controls.
  await page.getByText("Do you want to print this?").click();
  await page.emulateMedia({ media: "print" });
  const cr80 = page.locator("[data-print-format='cr80']");
  await expect(cr80).toBeVisible();
  const cr80Box = await cr80.boundingBox();
  expect(Math.round(cr80Box?.width ?? 0)).toBe(324);
  expect(Math.round(cr80Box?.height ?? 0)).toBe(204);
  await expect(cr80.locator("[data-part='profile']")).toBeVisible();
  const printedQuick = cr80.getByRole("region", { name: "Quick Access" });
  await expect(printedQuick).toBeVisible();
  for (const [name] of expected) await expect(printedQuick.getByText(name)).toBeVisible();
  expect(await cr80.locator("a, button").count()).toBe(0);
  await expect(page.getByRole("button", { name: "Add Byzcard to Home Screen" })).toBeHidden();
  await page.emulateMedia({ media: "screen" });
  await page.getByRole("radio", { name: /Event Badge/u }).check();
  await page.emulateMedia({ media: "print" });
  const badge = page.locator("[data-print-format='badge']");
  await expect(badge.getByRole("region", { name: "Quick Access" })).toBeVisible();
  await expect(badge.getByText("Scan to connect")).toBeVisible();
  expect(await badge.locator("a, button").count()).toBe(0);
  await page.emulateMedia({ media: "screen" });

  await page.getByRole("link", { name: "Edit card" }).click();
  await expect(page.getByLabel("LinkedIn (optional)")).toHaveValue(
    "https://linkedin.com/in/neerajmohanty",
  );
  await expect(page.getByLabel("Links 1 URL")).toHaveValue("https://github.com/ada");
});
