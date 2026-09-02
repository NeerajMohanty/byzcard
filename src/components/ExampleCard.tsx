"use client";

import { CardView } from "./CardView";
import { useShareQr } from "@/lib/useShareQr";
import { EXAMPLE_CARD } from "@/features/landing/exampleData";

/** The landing-page example card — its QR is real and generated locally. */
export function ExampleCard() {
  const { state } = useShareQr(EXAMPLE_CARD);
  return <CardView fields={EXAMPLE_CARD} photoUrl={null} qr={state?.qr ?? null} />;
}
