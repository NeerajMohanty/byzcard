import type { Metadata } from "next";
import { RecipientScreen } from "@/features/recipient/RecipientScreen";

export const metadata: Metadata = {
  title: "Business card — BYZCARD",
  robots: { index: false },
};

/**
 * Static recipient viewer. The card payload lives in the URL fragment,
 * which browsers never send to the server — the request is only for /s.
 */
export default function RecipientPage() {
  return <RecipientScreen />;
}
