import { mockDashboard } from "../src/data/fixtures";
import { exchangeGoogleCode } from "./google";
import {
  appOrigin,
  cookie,
  cookieName,
  digest,
  harden,
  randomToken,
  readCookie,
  safeReturnTo,
  sameOrigin,
  validToken,
} from "./security";
import type { Env, Member, Transaction } from "./types";

const json = (value: unknown, status = 200, headers?: HeadersInit) =>
  Response.json(value, { status, headers });
const redirect = (path: string, cookies: string[] = []) => {
  const headers = new Headers({ Location: path });
  cookies.forEach((value) => headers.append("Set-Cookie", value));
  return new Response(null, { status: 303, headers });
};
const now = () => Math.floor(Date.now() / 1000);
const publicUser = (member: Member) => ({
  id: member.id,
  name: member.name,
  department: member.department,
  initials: member.name.slice(0, 1),
});

async function session(request: Request, env: Env, origin: string) {
  const token = readCookie(request, cookieName("session", origin));
  if (!validToken(token)) return null;
  return env.DB.prepare(
    `SELECT m.id, m.email, m.google_sub, m.name, m.department, s.csrf_token
    FROM sessions s JOIN members m ON m.id = s.member_id
    WHERE s.token_hash = ? AND s.expires_at > ? AND m.is_active = 1`,
  )
    .bind(await digest(token), now())
    .first<Member & { csrf_token: string }>();
}

// The only dependency injection seam is for server tests, not an HTTP/config bypass.
export function createWorker(exchange = exchangeGoogleCode) {
  return {
    async fetch(request: Request, env: Env): Promise<Response> {
      const path = new URL(request.url).pathname;
      const isApi = path === "/api" || path.startsWith("/api/");
      try {
        const origin = appOrigin(env.APP_ORIGIN);
        if (new URL(request.url).origin !== origin)
          return harden(json({ error: "ORIGIN_MISMATCH" }, 400));
        // Only the login shell and build assets are public. Every other page hits the Worker first.
        if (!isApi) {
          if (!["GET", "HEAD"].includes(request.method))
            return harden(json({ error: "METHOD_NOT_ALLOWED" }, 405));
          if (
            path !== "/login" &&
            path !== "/index.html" &&
            !path.startsWith("/assets/") &&
            !path.startsWith("/brand/")
          ) {
            if (!(await session(request, env, origin)))
              return harden(
                redirect(
                  `/login?returnTo=${encodeURIComponent(safeReturnTo(path + new URL(request.url).search))}`,
                ),
              );
          }
          return harden(await env.ASSETS.fetch(request));
        }
        if (path === "/api/auth/start" && request.method === "POST") {
          if (!sameOrigin(request, origin))
            return harden(json({ error: "FORBIDDEN" }, 403));
          if (
            !env.GOOGLE_CLIENT_ID?.endsWith(".apps.googleusercontent.com") ||
            !env.GOOGLE_CLIENT_SECRET
          )
            return harden(json({ error: "AUTH_NOT_CONFIGURED" }, 503));
          if (
            request.headers.get("Content-Type")?.split(";")[0] !==
            "application/json"
          )
            return harden(json({ error: "INVALID_REQUEST" }, 415));
          if (Number(request.headers.get("Content-Length")) > 2048)
            return harden(json({ error: "INVALID_REQUEST" }, 413));
          const text = await request.text();
          if (text.length > 2048)
            return harden(json({ error: "INVALID_REQUEST" }, 413));
          let input: { remember?: unknown; returnTo?: unknown };
          try {
            input = JSON.parse(text);
            if (!input || typeof input !== "object" || Array.isArray(input))
              throw new Error();
          } catch {
            return harden(json({ error: "INVALID_REQUEST" }, 400));
          }
          const state = randomToken(),
            browser = randomToken(),
            verifier = randomToken(),
            nonce = randomToken();
          const previous = readCookie(request, cookieName("oauth", origin));
          const cleanup = [
            env.DB.prepare(
              "DELETE FROM oauth_transactions WHERE expires_at <= ?",
            ).bind(now()),
            env.DB.prepare("DELETE FROM sessions WHERE expires_at <= ?").bind(
              now(),
            ),
          ];
          if (validToken(previous))
            cleanup.push(
              env.DB.prepare(
                "DELETE FROM oauth_transactions WHERE browser_hash = ?",
              ).bind(await digest(previous)),
            );
          await env.DB.batch([
            ...cleanup,
            env.DB.prepare(
              "INSERT INTO oauth_transactions (state_hash, browser_hash, code_verifier, nonce, return_to, remember, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            ).bind(
              await digest(state),
              await digest(browser),
              verifier,
              nonce,
              safeReturnTo(input.returnTo),
              input.remember === true ? 1 : 0,
              now() + 600,
            ),
          ]);
          const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
          url.search = new URLSearchParams({
            client_id: env.GOOGLE_CLIENT_ID,
            redirect_uri: `${origin}/api/auth/callback`,
            response_type: "code",
            scope: "openid email profile",
            state,
            nonce,
            code_challenge: await digest(verifier),
            code_challenge_method: "S256",
            prompt: "select_account",
            ...(env.GOOGLE_WORKSPACE_DOMAIN
              ? { hd: env.GOOGLE_WORKSPACE_DOMAIN }
              : {}),
          }).toString();
          return harden(
            json({ url: url.href }, 200, {
              "Set-Cookie": cookie("oauth", browser, origin, 600),
            }),
          );
        }
        if (path === "/api/auth/callback" && request.method === "GET") {
          const params = new URL(request.url).searchParams;
          const state = params.get("state"),
            browser = readCookie(request, cookieName("oauth", origin));
          const cleared = cookie("oauth", "", origin, 0);
          if (
            !validToken(state) ||
            !validToken(browser) ||
            params.getAll("state").length !== 1
          )
            return harden(redirect("/login?error=oauth_expired", [cleared]));
          // Atomic consumption prevents successful replay, even with parallel callbacks.
          const tx = await env.DB.prepare(
            "DELETE FROM oauth_transactions WHERE state_hash = ? AND browser_hash = ? AND expires_at > ? RETURNING *",
          )
            .bind(await digest(state), await digest(browser), now())
            .first<Transaction>();
          if (!tx)
            return harden(redirect("/login?error=oauth_expired", [cleared]));
          const failure = (error: string) =>
            harden(
              redirect(
                `/login?error=${error}&returnTo=${encodeURIComponent(tx.return_to)}`,
                [cleared],
              ),
            );
          if (params.has("error")) return failure("access_denied");
          const code = params.get("code");
          if (!code || code.length > 4096 || params.getAll("code").length !== 1)
            return failure("auth_failed");
          try {
            const identity = await exchange(code, tx, env, origin);
            const member = await env.DB.prepare(
              "SELECT * FROM members WHERE email = ? AND is_active = 1",
            )
              .bind(identity.email)
              .first<Member>();
            if (
              !member ||
              (member.google_sub && member.google_sub !== identity.sub)
            )
              return failure("unregistered");
            // Pin the Google subject at first successful sign-in; an email alone cannot later replace it.
            const linked = await env.DB.prepare(
              "UPDATE members SET google_sub = ? WHERE id = ? AND is_active = 1 AND (google_sub IS NULL OR google_sub = ?) RETURNING *",
            )
              .bind(identity.sub, member.id, identity.sub)
              .first<Member>();
            if (!linked) return failure("unregistered");
            const token = randomToken(),
              csrf = randomToken(),
              ttl = tx.remember ? 7 * 86400 : 8 * 3600;
            const previous = readCookie(request, cookieName("session", origin));
            const statements = [
              env.DB.prepare(
                "INSERT INTO sessions (token_hash, member_id, csrf_token, expires_at) VALUES (?, ?, ?, ?)",
              ).bind(await digest(token), member.id, csrf, now() + ttl),
            ];
            if (validToken(previous))
              statements.unshift(
                env.DB.prepare(
                  "DELETE FROM sessions WHERE token_hash = ?",
                ).bind(await digest(previous)),
              );
            await env.DB.batch(statements);
            return harden(
              redirect(safeReturnTo(tx.return_to), [
                cleared,
                cookie("session", token, origin, tx.remember ? ttl : undefined),
              ]),
            );
          } catch {
            return failure("auth_failed");
          }
        }
        if (path === "/api/auth/session" && request.method === "GET") {
          const current = await session(request, env, origin);
          return harden(
            current
              ? json({
                  user: publicUser(current),
                  csrfToken: current.csrf_token,
                })
              : json({ user: null }, 401, {
                  "Set-Cookie": cookie("session", "", origin, 0),
                }),
          );
        }
        if (path === "/api/auth/logout" && request.method === "POST") {
          if (!sameOrigin(request, origin))
            return harden(json({ error: "FORBIDDEN" }, 403));
          const current = await session(request, env, origin);
          if (
            current &&
            request.headers.get("X-CSRF-Token") !== current.csrf_token
          )
            return harden(json({ error: "FORBIDDEN" }, 403));
          const token = readCookie(request, cookieName("session", origin));
          if (validToken(token))
            await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?")
              .bind(await digest(token))
              .run();
          return harden(
            json({ ok: true }, 200, {
              "Set-Cookie": cookie("session", "", origin, 0),
            }),
          );
        }
        if (path === "/api/dashboard" && request.method === "GET") {
          if (!(await session(request, env, origin)))
            return harden(json({ error: "UNAUTHORIZED" }, 401));
          // Business integrations are out of scope; authentication is real, this data remains a sample.
          return harden(json(mockDashboard));
        }
        if (
          [
            "/api/auth/start",
            "/api/auth/callback",
            "/api/auth/session",
            "/api/auth/logout",
            "/api/dashboard",
          ].includes(path)
        )
          return harden(json({ error: "METHOD_NOT_ALLOWED" }, 405));
        return harden(json({ error: "NOT_FOUND" }, 404));
      } catch {
        // Never serialize provider errors, request URLs, codes, cookies or secrets into logs/responses.
        return harden(json({ error: "SERVICE_UNAVAILABLE" }, 503));
      }
    },
  };
}
export default createWorker();
