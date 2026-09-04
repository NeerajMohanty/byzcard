import type { CardFields } from "@/core/card/types";

/**
 * Fictional example data used across every landing demonstration — the
 * hero card, the Meet/Scan/Save owner and recipient mocks, and the print
 * previews all read this one object so the examples can never drift apart.
 *
 * The optional profile fields are populated so the landing shows what the
 * product actually supports. Every URL is a demo placeholder. Values are
 * kept short on purpose: they all travel inside the share fragment, and
 * test/core/exampleCard.test.ts holds the QR budget to the soft limit.
 *
 * Plain module (no "use client") so both server and client components can
 * import the value directly.
 */
export const EXAMPLE_CARD: CardFields = {
  fullName: "John Doe",
  preferredName: "John",
  pronouns: "he/him",
  role: "Product Designer",
  headline: "Designing simple digital experiences",
  company: "Byzcard.cc",
  phone: "+1 555 010 0100",
  email: "john.doe@example.com",
  website: "https://byzcard.cc",
  social: [{ service: "linkedin", value: "https://www.linkedin.com/in/johndoe-demo" }],
  messaging: [{ service: "whatsapp", value: "https://wa.me/15550100100" }],
  links: [{ service: "github", value: "https://github.com/johndoe-demo" }],
};

/**
 * The demo QR always encodes the production recipient flow, so scanning it
 * from any environment opens the real Byzcard recipient page.
 */
export const EXAMPLE_SHARE_ORIGIN = "https://byzcard.cc";
