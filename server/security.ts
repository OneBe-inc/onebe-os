export function randomToken(): string {
  return btoa(
    String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))),
  )
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
export async function digest(value: string): Promise<string> {
  const bytes = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
  );
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
export function validToken(value: string | null | undefined): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{43}$/.test(value);
}
export { safeReturnTo } from "../src/return-to";
export function appOrigin(value: string): string {
  const url = new URL(value);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    url.hostname.endsWith(".invalid") ||
    (url.protocol !== "https:" && !(local && url.protocol === "http:"))
  )
    throw new Error("CONFIGURATION");
  return url.origin;
}
export function cookieName(kind: "session" | "oauth", origin: string): string {
  return new URL(origin).protocol === "https:"
    ? `__Host-onebe-${kind}`
    : `onebe-local-${kind}`;
}
export function readCookie(request: Request, name: string): string | null {
  const entries = (request.headers.get("Cookie") ?? "")
    .split(";")
    .map((x) => x.trim())
    .filter((x) => x.startsWith(name + "="));
  // Duplicate cookies must not cause an ambiguous session selection.
  return entries.length === 1 ? entries[0].slice(name.length + 1) : null;
}
export function cookie(
  kind: "session" | "oauth",
  token: string,
  origin: string,
  maxAge?: number,
): string {
  const secure = new URL(origin).protocol === "https:" ? "; Secure" : "";
  return `${cookieName(kind, origin)}=${token}; Path=/; HttpOnly; SameSite=Lax${secure}${maxAge === undefined ? "" : `; Max-Age=${maxAge}`}`;
}
export function sameOrigin(request: Request, origin: string): boolean {
  return (
    request.headers.get("Origin") === origin &&
    request.headers.get("Sec-Fetch-Site") !== "cross-site"
  );
}
export function harden(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "no-store");
  headers.set("Referrer-Policy", "no-referrer");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("X-Robots-Tag", "noindex, nofollow");
  headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://googleusercontent.com https://*.googleusercontent.com; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  );
  return new Response(response.body, { status: response.status, headers });
}
