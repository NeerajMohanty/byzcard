import type { Metadata } from "next";
import { EditorScreen } from "@/features/editor/EditorScreen";

export const metadata: Metadata = { title: "Create your card — BYZCARD" };

export default function CreatePage() {
  return <EditorScreen />;
}
