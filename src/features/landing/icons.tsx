/**
 * Tiny decorative stroke glyphs for the landing page — local, currentColor,
 * hidden from the accessibility tree. No icon package.
 */

function Glyph({ children }: { children: React.ReactNode }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function QrGlyph() {
  return (
    <Glyph>
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <path d="M14 14h3v3h-3zM20 14v0M20 20h-3M20 17v3" />
    </Glyph>
  );
}

export function HomeGlyph() {
  return (
    <Glyph>
      <path d="M4 11l8-7 8 7" />
      <path d="M6 9.5V20h12V9.5" />
      <path d="M10 20v-5h4v5" />
    </Glyph>
  );
}

export function ContactGlyph() {
  return (
    <Glyph>
      <circle cx="10" cy="9" r="3.2" />
      <path d="M4.5 19c.8-3 3-4.5 5.5-4.5S14.7 16 15.5 19" />
      <path d="M16.5 8.5l1.8 1.8L21.5 7" />
    </Glyph>
  );
}

export function PrintGlyph() {
  return (
    <Glyph>
      <path d="M7 8V4h10v4" />
      <rect x="4" y="8" width="16" height="8" rx="1.5" />
      <path d="M7 13h10v7H7z" />
    </Glyph>
  );
}

export function NfcGlyph() {
  return (
    <Glyph>
      <path d="M6 8.5a6.5 6.5 0 010 7" />
      <path d="M9.5 6.5a10 10 0 010 11" />
      <path d="M13 4.5a13.5 13.5 0 010 15" />
    </Glyph>
  );
}

export function WalletGlyph() {
  return (
    <Glyph>
      <rect x="3.5" y="6" width="17" height="12" rx="2.5" />
      <path d="M3.5 10h17" />
      <path d="M15 14.5h2.5" />
    </Glyph>
  );
}

export function CheckGlyph() {
  return (
    <Glyph>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </Glyph>
  );
}
