const PUBLIC_REPO = "https://github.com/NeerajMohanty/byzcard";

/**
 * Public GitHub link. Defaults to the public Byzcard repository; an operator
 * can point NEXT_PUBLIC_GITHUB_URL at a fork, or set it to an empty string
 * to hide the links entirely. Only https://github.com/... values are used.
 */
export function githubUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_GITHUB_URL;
  if (raw === undefined) return PUBLIC_REPO;
  if (raw.trim() === "") return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return null;
    if (url.hostname !== "github.com") return null;
    if (url.pathname.length <= 1) return null;
    return url.toString();
  } catch {
    return null;
  }
}
