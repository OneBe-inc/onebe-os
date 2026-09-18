import shell from "../dist/client/index.html";
import { json, policiesApi } from "./api.ts";
import type { DriveEnv } from "./drive.ts";
export default {
  async fetch(
    request: Request,
    env: DriveEnv & { ASSETS?: { fetch: typeof fetch } },
  ) {
    const path = new URL(request.url).pathname;
    if (path === "/api/policies" || path.startsWith("/api/policies/"))
      return policiesApi(request, env);
    if (path.startsWith("/api/")) return json({ code: "not_found" }, 404);
    if (request.method !== "GET" && request.method !== "HEAD")
      return new Response("Method not allowed", { status: 405 });
    if (path.startsWith("/assets/") || path.startsWith("/brand/"))
      return env.ASSETS
        ? env.ASSETS.fetch(request)
        : new Response("Not found", { status: 404 });
    return new Response(request.method === "HEAD" ? null : shell, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-cache",
        "X-Content-Type-Options": "nosniff",
      },
    });
  },
};
