/**
 * Small inline glyphs for the ID card: one badge per supported link service
 * (Quick Access tiles) and the three contact-row icons. Every icon is
 * decorative — the readable label beside it carries the meaning — so callers
 * wrap them in an aria-hidden element. Pure SVG: screen and print identical.
 */

interface BadgeProps {
  fill: string;
  round?: boolean;
  children: React.ReactNode;
}

/** A 24×24 brand tile: rounded square (or circle) with a white glyph. */
function Badge({ fill, round = false, children }: BadgeProps) {
  return (
    <svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true" focusable="false">
      {round ? (
        <circle cx="12" cy="12" r="11" fill={fill} />
      ) : (
        <rect x="1" y="1" width="22" height="22" rx="6" fill={fill} />
      )}
      {children}
    </svg>
  );
}

const STROKE = {
  fill: "none",
  stroke: "#ffffff",
  strokeWidth: 1.6,
  strokeLinecap: "round",
} as const;

const GLYPHS: Record<string, React.ReactNode> = {
  linkedin: (
    <Badge fill="#0a66c2">
      <path
        fill="#ffffff"
        d="M7.1 9.6h2.5v8H7.1zM8.35 6.1a1.45 1.45 0 1 1 0 2.9 1.45 1.45 0 0 1 0-2.9zM11.2 9.6h2.4v1.1c.4-.7 1.3-1.3 2.6-1.3 2.5 0 2.9 1.6 2.9 3.7v4.5h-2.5v-4c0-1 0-2.2-1.4-2.2s-1.6 1-1.6 2.1v4.1h-2.4z"
      />
    </Badge>
  ),
  github: (
    <Badge fill="#24292f" round>
      <g transform="translate(5 4.8) scale(0.585)">
        <path
          fill="#ffffff"
          d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
        />
      </g>
    </Badge>
  ),
  instagram: (
    <Badge fill="#e1306c">
      <rect x="6.6" y="6.6" width="10.8" height="10.8" rx="3.2" {...STROKE} />
      <circle cx="12" cy="12" r="2.6" {...STROKE} />
      <circle cx="15.5" cy="8.5" r="0.9" fill="#ffffff" />
    </Badge>
  ),
  x: (
    <Badge fill="#111111">
      <path d="M7.2 7.2l9.6 9.6M16.8 7.2l-9.6 9.6" {...STROKE} strokeWidth={2} />
    </Badge>
  ),
  facebook: (
    <Badge fill="#1877f2" round>
      <path
        fill="#ffffff"
        d="M13.3 19.5v-6.1h2.1l.3-2.5h-2.4V9.3c0-.7.2-1.2 1.2-1.2h1.3V5.9c-.2 0-1-.1-1.9-.1-1.9 0-3.1 1.1-3.1 3.2v1.9H8.7v2.5h2.1v6.1z"
      />
    </Badge>
  ),
  youtube: (
    <Badge fill="#ff0000">
      <path fill="#ffffff" d="M9.8 8.4v7.2l6.2-3.6z" />
    </Badge>
  ),
  tiktok: (
    <Badge fill="#111111">
      <path
        fill="#ffffff"
        d="M13.2 5h2.3c.2 1.7 1.3 2.8 2.9 3v2.3c-1.1 0-2.1-.3-2.9-.9v5.1a4.3 4.3 0 1 1-4.3-4.3h.7v2.3h-.7a2 2 0 1 0 2 2z"
      />
    </Badge>
  ),
  threads: (
    <Badge fill="#111111" round>
      <circle cx="12" cy="12" r="3" {...STROKE} />
      <path d="M15 12v1.3a1.8 1.8 0 0 0 3.6 0V12a6.6 6.6 0 1 0-2.7 5.3" {...STROKE} />
    </Badge>
  ),
  whatsapp: (
    <Badge fill="#25d366" round>
      <path
        d="M12 5.2a6.8 6.8 0 0 0-5.8 10.3l-.8 3 3.1-.8A6.8 6.8 0 1 0 12 5.2z"
        {...STROKE}
        strokeWidth={1.5}
      />
      <path
        fill="#ffffff"
        d="M15.1 13.6c-.2-.1-1.1-.5-1.3-.6-.2-.1-.3-.1-.4.1l-.6.7c-.1.1-.2.2-.4.1a5 5 0 0 1-2.5-2.2c-.2-.3.2-.3.5-1 .1-.1 0-.3 0-.4l-.6-1.4c-.2-.4-.3-.3-.4-.3h-.4a.7.7 0 0 0-.5.2c-.2.2-.7.7-.7 1.7s.7 1.9.8 2.1c.1.1 1.4 2.2 3.5 3 1.3.6 1.8.6 2.4.5.4-.1 1.1-.5 1.3-.9.2-.5.2-.8.1-.9l-.4-.2z"
      />
    </Badge>
  ),
  signal: (
    <Badge fill="#3a76f0" round>
      <path d="M12 6.4a5.6 5.6 0 0 0-4.8 8.5l-.7 2.7 2.8-.7A5.6 5.6 0 1 0 12 6.4z" {...STROKE} />
    </Badge>
  ),
  telegram: (
    <Badge fill="#229ed9" round>
      <path
        fill="#ffffff"
        d="M6.3 11.7l10.3-4.1c.5-.2 1 .1.8.8l-1.8 8.3c-.1.6-.5.7-1 .4l-2.7-2-1.3 1.3c-.2.2-.4.2-.6.2l.2-2.7 4.9-4.5c.2-.2 0-.3-.3-.1l-6.1 3.8-2.6-.8c-.6-.2-.6-.6.2-.9z"
      />
    </Badge>
  ),
  discord: (
    <Badge fill="#5865f2" round>
      <path
        fill="#ffffff"
        d="M8.3 8.3a9.4 9.4 0 0 1 2.3-.7l.3.6a8.6 8.6 0 0 1 2.2 0l.3-.6a9.4 9.4 0 0 1 2.3.7c1.5 2.2 2 4.4 1.8 6.6a9.5 9.5 0 0 1-2.8 1.4l-.6-1a6.1 6.1 0 0 1-.9.4l.5.9a9.4 9.4 0 0 1-3.4 0l.5-.9-.9-.4-.6 1a9.5 9.5 0 0 1-2.8-1.4c-.2-2.2.3-4.4 1.8-6.6z"
      />
      <circle cx="10.1" cy="12.2" r="1" fill="#5865f2" />
      <circle cx="13.9" cy="12.2" r="1" fill="#5865f2" />
    </Badge>
  ),
  calendly: (
    <Badge fill="#006bff" round>
      <rect x="7" y="7.6" width="10" height="9.4" rx="1.6" {...STROKE} />
      <path d="M7 10.6h10M9.6 6v2.6M14.4 6v2.6" {...STROKE} />
    </Badge>
  ),
  portfolio: (
    <Badge fill="#6d5bd0">
      <rect x="5.5" y="9" width="13" height="8.5" rx="1.8" fill="#ffffff" />
      <path d="M9.8 9V7.6A1.1 1.1 0 0 1 10.9 6.5h2.2a1.1 1.1 0 0 1 1.1 1.1V9" {...STROKE} />
      <path d="M5.5 12.6h13" stroke="#6d5bd0" strokeWidth={1.2} />
    </Badge>
  ),
  custom: (
    <Badge fill="#4b5563" round>
      <circle cx="12" cy="12" r="5.6" {...STROKE} strokeWidth={1.5} />
      <path
        d="M6.4 12h11.2M12 6.4c2 2 2 9.2 0 11.2M12 6.4c-2 2-2 9.2 0 11.2"
        {...STROKE}
        strokeWidth={1.3}
      />
    </Badge>
  ),
};

/** Brand-style badge for a link service; unknown ids fall back to the globe. */
export function ServiceIcon({ service }: { service: string }) {
  return <>{GLYPHS[service] ?? GLYPHS.custom}</>;
}

export type ContactIconKind = "phone" | "mail" | "globe";

const CONTACT = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

/** Thin line icon for a contact row, drawn in the current text colour. */
export function ContactIcon({ kind }: { kind: ContactIconKind }) {
  return (
    <svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true" focusable="false">
      {kind === "phone" && (
        <path
          d="M6.6 4.5h3l1.5 3.8-1.9 1.4a11 11 0 0 0 5.1 5.1l1.4-1.9 3.8 1.5v3a1.5 1.5 0 0 1-1.6 1.5A15.5 15.5 0 0 1 5.1 6.1a1.5 1.5 0 0 1 1.5-1.6z"
          {...CONTACT}
        />
      )}
      {kind === "mail" && (
        <>
          <rect x="3.5" y="6" width="17" height="12" rx="2.2" {...CONTACT} />
          <path d="M4.5 7.5l7.5 5.5 7.5-5.5" {...CONTACT} />
        </>
      )}
      {kind === "globe" && (
        <>
          <circle cx="12" cy="12" r="8" {...CONTACT} />
          <path d="M4 12h16M12 4c2.6 2.6 2.6 13.4 0 16M12 4c-2.6 2.6-2.6 13.4 0 16" {...CONTACT} />
        </>
      )}
    </svg>
  );
}
