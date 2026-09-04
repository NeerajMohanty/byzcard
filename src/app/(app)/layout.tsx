import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";

/**
 * Application shell for /create, /card and /s — the phone-width column the
 * product screens were designed in. The marketing homepage lives outside
 * this group and provides its own full-width layout. The slim brand header
 * gives every app screen an obvious way back to the homepage; it is
 * screen-only so print output stays exact.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="app-header screenOnly">
        <Link href="/" className="app-brand">
          <BrandMark iconSize={16} />
        </Link>
      </header>
      <main className="app-shell">{children}</main>
    </>
  );
}
