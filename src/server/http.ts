/**
 * HTTP helpers for the Wallet signing endpoints.
 * Privacy rules enforced here: no-store responses everywhere, request
 * bodies size-limited, and card data never logged.
 */

export const NO_STORE_HEADERS: Record<string, string> = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

/** JSON response that must never be cached. */
export function noStoreJson(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...NO_STORE_HEADERS, "Content-Type": "application/json" },
  });
}

export function errorJson(status: number, code: string): Response {
  return noStoreJson({ error: code }, status);
}

/**
 * Browser CSRF/origin check: if an Origin header is present it must match
 * the configured app origin. (Non-browser clients send no Origin.)
 */
export function originAllowed(request: Request, configuredAppUrl: string): boolean {
  const origin = request.headers.get("origin");
  if (origin === null) return true;
  try {
    return new URL(origin).origin === new URL(configuredAppUrl).origin;
  } catch {
    return false;
  }
}

/** Cheap pre-parse gate: the endpoints accept only JSON bodies. */
export function isJsonContentType(request: Request): boolean {
  const type = request.headers.get("content-type") ?? "";
  return type.split(";")[0]?.trim().toLowerCase() === "application/json";
}

/** Read a JSON body with a hard byte limit. Returns null when invalid. */
export async function readJsonBody(request: Request, maxBytes: number): Promise<unknown | null> {
  const lengthHeader = request.headers.get("content-length");
  if (lengthHeader !== null) {
    const declared = Number.parseInt(lengthHeader, 10);
    if (Number.isFinite(declared) && declared > maxBytes) return null;
  }
  let text: string;
  try {
    text = await request.text();
  } catch {
    return null;
  }
  if (new TextEncoder().encode(text).length > maxBytes) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
