import type { QrSymbol } from "@/core/qr";
import { qrToSvgPath } from "@/core/qr";

interface QrSvgProps {
  symbol: QrSymbol;
  /** Accessible description of what the code contains. */
  label: string;
  /** White-tile padding in px — the quiet zone. Print layouts size it up. */
  padding?: number;
}

/**
 * Crisp SVG rendering of a QR symbol on a white tile.
 * The white padding provides the required quiet zone.
 */
export function QrSvg({ symbol, label, padding = 10 }: QrSvgProps) {
  return (
    <div
      role="img"
      aria-label={label}
      style={{
        background: "#ffffff",
        borderRadius: 12,
        padding,
        lineHeight: 0,
        display: "inline-block",
      }}
    >
      <svg
        viewBox={`0 0 ${symbol.size} ${symbol.size}`}
        width="100%"
        height="100%"
        shapeRendering="crispEdges"
        aria-hidden="true"
      >
        <path d={qrToSvgPath(symbol)} fill="#0b1220" />
      </svg>
    </div>
  );
}
