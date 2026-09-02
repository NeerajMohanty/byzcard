/**
 * Application shell for /create, /card and /s — the phone-width column the
 * product screens were designed in. The marketing homepage lives outside
 * this group and provides its own full-width layout.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <main className="app-shell">{children}</main>;
}
