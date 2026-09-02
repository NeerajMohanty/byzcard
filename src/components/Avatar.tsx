import { initialsOf } from "@/core/card/types";

interface AvatarProps {
  fullName: string;
  photoUrl: string | null;
  /** Diameter in px. */
  size: number;
}

/** Circular photo, or an initials tile when no photo exists. */
export function Avatar({ fullName, photoUrl, size }: AvatarProps) {
  const style: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: "50%",
    flexShrink: 0,
  };
  if (photoUrl !== null) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- local object URL, next/image cannot optimize it
      <img
        src={photoUrl}
        alt={`Photo of ${fullName === "" ? "the card owner" : fullName}`}
        style={{ ...style, objectFit: "cover", border: "2px solid rgba(255,255,255,0.18)" }}
        width={size}
        height={size}
      />
    );
  }
  return (
    <div
      aria-hidden="true"
      style={{
        ...style,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #1d2942 0%, #131b30 100%)",
        border: "2px solid rgba(255,255,255,0.14)",
        color: "#e8eaf0",
        fontWeight: 600,
        fontSize: Math.round(size * 0.34),
        letterSpacing: "0.02em",
        userSelect: "none",
      }}
    >
      {initialsOf(fullName)}
    </div>
  );
}
