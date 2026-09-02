/**
 * Optional public GitHub link. The repository is not public yet, so the
 * URL is never hardcoded: links render only when the operator configures
 * NEXT_PUBLIC_GITHUB_URL with a valid https://github.com/... address.
 */
export function githubUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_GITHUB_URL;
  if (raw === undefined || raw.trim() === "") return null;
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
