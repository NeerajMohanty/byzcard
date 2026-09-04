import { CardView } from "./CardView";
import type { QrSymbol } from "@/core/qr";
import { EXAMPLE_CARD } from "@/features/landing/exampleData";

/**
 * The landing-page example card. The QR is precomputed on the server
 * (features/landing/exampleQr) and passed in, so rendering this card does no
 * QR work and its dimensions are final from the first paint.
 */
export function ExampleCard({ qr }: { qr: QrSymbol }) {
  return <CardView fields={EXAMPLE_CARD} photoUrl={null} qr={qr} />;
}
