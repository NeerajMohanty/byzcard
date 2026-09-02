import type { Metadata } from "next";
import { CardScreen } from "@/features/card/CardScreen";

export const metadata: Metadata = { title: "Your card — BYZCARD" };

export default function CardPage() {
  return <CardScreen />;
}
