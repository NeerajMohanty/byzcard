import { initialsOf, type PhotoCrop } from "@/core/card/types";
import { cropLayout } from "@/lib/cropLayout";

interface AvatarProps {
  fullName: string;
  photoUrl: string | null;
  /** Frame width in px; the frame is a 4:5 portrait rounded rectangle. */
  size: number;
  /** Optional user-chosen framing; defaults to centered cover, no zoom. */
  crop?: PhotoCrop;
  /** Natural image aspect (width / height); square assumed when unknown. */
  aspect?: number;
}

/**
 * Portrait rounded-rectangle photo (4:5), or an initials tile when no
 * photo exists. The image is laid out with explicit cover math (not
 * object-fit), so the user's pan can reach every part of the original and
 * the frame can never show empty space. Pure CSS — screen and print
 * render identically.
 */
export function Avatar({ fullName, photoUrl, size, crop, aspect }: AvatarProps) {
  const height = Math.round(size * 1.25);
  const frame: React.CSSProperties = {
    width: size,
    height,
    borderRadius: Math.max(6, Math.round(size * 0.125)),
    overflow: "hidden",
    flexShrink: 0,
  };
  if (photoUrl !== null) {
    const layout = cropLayout(aspect, crop);
    const pct = (v: number): string => `${(v * 100).toFixed(3)}%`;
    return (
      <div style={{ ...frame, position: "relative", border: "2px solid rgba(255,255,255,0.18)" }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- local object URL, next/image cannot optimize it */}
        <img
          src={photoUrl}
          alt={`Photo of ${fullName === "" ? "the card owner" : fullName}`}
          draggable={false}
          style={{
            position: "absolute",
            display: "block",
            maxWidth: "none",
            width: pct(layout.w),
            height: pct(layout.h),
            left: pct(layout.left),
            top: pct(layout.top),
          }}
        />
      </div>
    );
  }
  return (
    <div
      aria-hidden="true"
      style={{
        ...frame,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #1d2942 0%, #131b30 100%)",
        border: "2px solid rgba(255,255,255,0.14)",
        color: "#ffffff",
        fontWeight: 600,
        fontSize: Math.round(size * 0.3),
        letterSpacing: "0.02em",
        userSelect: "none",
      }}
    >
      {initialsOf(fullName)}
    </div>
  );
}
