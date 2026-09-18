import { accessToken, configured, DriveError, DriveReader } from "./drive.ts";
import type { DriveEnv } from "./drive.ts";

const headers = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
  Vary: "Cookie",
};
export const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers });

export async function policiesApi(
  request: Request,
  env: DriveEnv,
  send: typeof fetch = fetch,
) {
  // Trusted identity comes only from the Sites dispatcher, never from the UI's demo session.
  // Standalone Workers must not enable this mode without an authenticating, header-stripping proxy.
  if (env.POLICIES_AUTH_MODE !== "sites")
    return json({ code: "auth_not_configured" }, 503);
  if (!request.headers.get("oai-authenticated-user-id"))
    return json({ code: "sign_in_required" }, 401);
  if (request.method !== "GET")
    return json({ code: "method_not_allowed" }, 405);
  const url = new URL(request.url);
  if (url.pathname === "/api/policies/status")
    return json({ configured: configured(env) });
  const match = url.pathname.match(
    /^\/api\/policies\/([a-zA-Z0-9_-]+)\/content$/,
  );
  if (url.pathname !== "/api/policies" && !match)
    return json({ code: "not_found" }, 404);
  if (!configured(env)) return json({ code: "not_configured" }, 503);
  try {
    const reader = new DriveReader(env, await accessToken(env, send), send);
    if (!match)
      return json({
        files: await reader.list(),
        fetchedAt: new Date().toISOString(),
      });
    const result = await reader.content(match[1]);
    if (result.format === "document")
      return json({
        id: result.file.id,
        name: result.file.name,
        text: new TextDecoder().decode(result.bytes),
        modifiedTime: result.file.modifiedTime,
      });
    return new Response(result.bytes, {
      headers: {
        ...headers,
        "Content-Type": "application/pdf",
        "Content-Disposition": 'inline; filename="regulation.pdf"',
        "Content-Security-Policy": "frame-ancestors 'self'",
      },
    });
  } catch (error) {
    return json(
      { code: error instanceof DriveError ? error.code : "connection_failed" },
      error instanceof DriveError ? error.status : 502,
    );
  }
}
