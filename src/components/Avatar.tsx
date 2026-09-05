import { initialsOf, type PhotoCrop } from "@/core/card/types";
import { cropLayout } from "@/lib/cropLayout";

export type AvatarShape = "portrait" | "circle";

interface AvatarProps {
  fullName: string;
  photoUrl: string | null;
  /** Frame width in px (portrait: 4:5 rectangle; circle: diameter). */
  size: number;
  /** Optional user-chosen framing; defaults to centered cover, no zoom. */
  crop?: PhotoCrop;
  /** Natural image aspect (width / height); square assumed when unknown. */
  aspect?: number;
  /**
   * "portrait" (default) is the 4:5 framing window the photo editor works
   * in. "circle" shows the circle inscribed in that same window — full
   * width, vertically centred — so the stored crop is honoured unchanged.
   */
  shape?: AvatarShape;
}

/**
 * The card photo, or an initials tile when no photo exists. The image is
 * laid out with explicit cover math (not object-fit), so the user's pan can
 * reach every part of the original and the frame can never show empty
 * space. Pure CSS — screen and print render identically.
 */
export function Avatar({
  fullName,
  photoUrl,
  size,
  crop,
  aspect,
  shape = "portrait",
}: AvatarProps) {
  const circle = shape === "circle";
  const height = circle ? size : Math.round(size * 1.25);
  const frame: React.CSSProperties = {
    width: size,
    height,
    borderRadius: circle ? "50%" : Math.max(6, Math.round(size * 0.125)),
    overflow: "hidden",
    flexShrink: 0,
  };
  if (photoUrl !== null) {
    const layout = cropLayout(aspect, crop);
    const pct = (v: number): string => `${(v * 100).toFixed(3)}%`;
    const image = (
      // eslint-disable-next-line @next/next/no-img-element -- local object URL, next/image cannot optimize it
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
    );
    return (
      <div style={{ ...frame, position: "relative", border: "2px solid rgba(255,255,255,0.22)" }}>
        {circle ? (
          // The 4:5 window the crop was chosen in, centred behind the circle.
          <div
            style={{
              position: "absolute",
              left: 0,
              top: "-12.5%",
              width: "100%",
              height: "125%",
            }}
          >
            {image}
          </div>
        ) : (
          image
        )}
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
        background: "linear-gradient(135deg, #24345c 0%, #141d36 100%)",
        border: "2px solid rgba(255,255,255,0.16)",
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
