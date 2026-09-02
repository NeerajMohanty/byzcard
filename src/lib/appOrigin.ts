/**
 * Canonical app origin (client side).
 * NEXT_PUBLIC_APP_URL is inlined at build time; when unset (e.g. a
 * self-hosted build without configuration) the live origin is used, which
 * keeps share URLs correct on any deployment.
 */
export function appOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (configured !== undefined && configured !== "") return configured.replace(/\/+$/u, "");
  if (typeof window !== "undefined") return window.location.origin;
  return "http://localhost:3000";
}
