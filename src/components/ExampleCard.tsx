"use client";

import type { CardFields } from "@/core/card/types";
import { CardView } from "./CardView";
import { useShareQr } from "@/lib/useShareQr";

const EXAMPLE: CardFields = {
  fullName: "Maya Castellanos",
  role: "Product Designer",
  company: "Northwind Studio",
  phone: "+1 647 555 0184",
  email: "maya@northwind.studio",
  website: "https://northwind.studio",
};

/** The landing-page example card — its QR is real and generated locally. */
export function ExampleCard() {
  const { state } = useShareQr(EXAMPLE);
  return <CardView fields={EXAMPLE} photoUrl={null} qr={state?.qr ?? null} />;
}
