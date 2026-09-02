import { expect, type ConsoleMessage, type Page } from "@playwright/test";
import { solidPng } from "../src/server/png";

/**
 * Always-allowed browser advisories that are not application errors:
 * WebKit's CSS-preload timing heuristic, and WebKit's unconditional log of
 * the handled, credential-free wallet-config fetch abort on navigation.
 */
export const BASE_ALLOWED_CONSOLE: readonly RegExp[] = [
  /was preloaded using link preload but not used within/u,
  /wallet-config.*(access control checks|aborted|cancelled)/u,
  // Same WebKit behavior for a Next.js RSC payload fetch (framework
  // navigation plumbing for public pages, no card data) aborted by an
  // immediate follow-up navigation.
  /_rsc=.*(access control checks|aborted|cancelled)/u,
];

/** Per-spec console cleanliness guard (errors, warnings, page errors). */
export interface ConsoleGuard {
  entries: string[];
  /** Extra per-test allowances (cleared by reset). */
  allow: RegExp[];
  reset(): void;
  watch(page: Page): void;
  assertClean(): void;
}

export function makeConsoleGuard(): ConsoleGuard {
  const guard: ConsoleGuard = {
    entries: [],
    allow: [],
    reset() {
      guard.entries.length = 0;
      guard.allow.length = 0;
    },
    watch(page: Page) {
      page.on("console", (message: ConsoleMessage) => {
        if (message.type() === "error" || message.type() === "warning") {
          guard.entries.push(`[${message.type()}] ${message.text()}`);
        }
      });
      page.on("pageerror", (error) => {
        guard.entries.push(`[pageerror] ${error.message}`);
      });
    },
    assertClean() {
      const allowed = [...BASE_ALLOWED_CONSOLE, ...guard.allow];
      const unexpected = guard.entries.filter(
        (entry) => !allowed.some((pattern) => pattern.test(entry)),
      );
      expect(unexpected, "browser console must be clean").toEqual([]);
    },
  };
  return guard;
}

export const TEST_CARD = {
  fullName: "Ada Lovelace",
  role: "Chief Analyst",
  company: "Analytical Engines",
  phone: "+1 647 000 0000",
  email: "ada@example.com",
  website: "example.com",
} as const;

/** Fill the editor form (optionally with a generated photo), no save. */
export async function fillCardForm(
  page: Page,
  withPhoto = true,
  withWebsite = true,
): Promise<void> {
  await page.getByLabel("Full name").fill(TEST_CARD.fullName);
  await page.getByLabel("Role / title").fill(TEST_CARD.role);
  await page.getByLabel("Company").fill(TEST_CARD.company);
  await page.getByLabel("Phone").fill(TEST_CARD.phone);
  await page.getByLabel("Email").fill(TEST_CARD.email);
  if (withWebsite) {
    await page.getByLabel(/Website/u).fill(TEST_CARD.website);
  }
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
export async function createCard(page: Page, withPhoto = true, withWebsite = true): Promise<void> {
  await page.goto("/create");
  await fillCardForm(page, withPhoto, withWebsite);
  await page.getByRole("button", { name: "Save card" }).click();
  await page.waitForURL("**/card");
}
