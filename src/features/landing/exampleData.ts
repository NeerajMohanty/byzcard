import type { CardFields } from "@/core/card/types";

/**
 * Fictional example data used across the landing demonstrations.
 * Plain module (no "use client") so both server and client components can
 * import the value directly.
 */
export const EXAMPLE_CARD: CardFields = {
  fullName: "Maya Castellanos",
  role: "Product Designer",
  company: "Northwind Studio",
  phone: "+1 647 555 0184",
  email: "maya@northwind.studio",
  website: "https://northwind.studio",
};
