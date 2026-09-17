import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from "jose";
import { createWorker } from "./index";
import { cookieName, digest, safeReturnTo } from "./security";
import { identityFromClaims, verifyGoogleIdToken } from "./google";
import { googleAvatarUrl } from "../src/avatar-url";
import type {
  Database,
  Env,
  Statement,
  Transaction,
  GoogleIdentity,
} from "./types";

const ORIGIN = "https://portal.example.test";
const clientId = "unit-test.apps.googleusercontent.com";
function setup(
  identity: GoogleIdentity = {
    sub: "google-123",
    email: "member@example.test",
  },
) {
  const db = new DatabaseSync(":memory:");
  db.exec(
    readFileSync(
      new URL("../migrations/0001_auth.sql", import.meta.url),
      "utf8",
    ),
  );
  db.exec(
    readFileSync(
      new URL("../migrations/0002_member_avatar.sql", import.meta.url),
      "utf8",
    ),
  );
  class Prepared implements Statement {
    constructor(
      readonly sql: string,
      readonly values: (string | number | null)[] = [],
    ) {}
    bind(...values: (string | number | null)[]) {
      return new Prepared(this.sql, values);
    }
    async first<T>() {
      return (db.prepare(this.sql).get(...this.values) ?? null) as T | null;
    }
    async run() {
      return db.prepare(this.sql).run(...this.values);
    }
  }
  const database: Database = {
    prepare: (sql) => new Prepared(sql),
    async batch(statements) {
      db.exec("BEGIN");
      try {
        const results = [];
        for (const statement of statements) results.push(await statement.run());
        db.exec("COMMIT");
        return results;
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }
    },
  };
  const env: Env = {
    DB: database,
    ASSETS: { fetch: async () => new Response("<html>login shell</html>") },
    APP_ORIGIN: ORIGIN,
    GOOGLE_CLIENT_ID: clientId,
    GOOGLE_CLIENT_SECRET: "unit-secret-not-real",
  };
  let calls = 0;
  let transaction: Transaction | undefined;
  const worker = createWorker(async (_code, tx) => {
    calls++;
    transaction = tx;
    return identity;
  });
  const req = (path: string, init?: RequestInit) =>
    worker.fetch(new Request(ORIGIN + path, init), env);
  const addMember = (sub: string | null = null) =>
    db
      .prepare(
        "INSERT INTO members (id, email, google_sub, name, department) VALUES (?, ?, ?, ?, ?)",
      )
      .run("m1", "member@example.test", sub, "テスト 太郎", "営業部");
  const start = async (remember = true, returnTo = "/finance/contracts") => {
    const response = await req("/api/auth/start", {
      method: "POST",
      headers: { Origin: ORIGIN, "Content-Type": "application/json" },
      body: JSON.stringify({ remember, returnTo }),
    });
    assert.equal(response.status, 200);
    const body = (await response.json()) as { url: string };
    return {
      url: new URL(body.url),
      cookie: response.headers.get("Set-Cookie")!.split(";")[0],
    };
  };
  const callback = async (
    flow: Awaited<ReturnType<typeof start>>,
    extra = "",
  ) =>
    req(
      `/api/auth/callback?state=${flow.url.searchParams.get("state")}&code=code${extra}`,
      { headers: { Cookie: flow.cookie } },
    );
  const signIn = async (remember = true) => {
    addMember();
    const flow = await start(remember);
    const response = await callback(flow);
    assert.equal(response.status, 303);
    const fullCookie = response.headers
      .getSetCookie()
      .find((value) => value.startsWith("__Host-onebe-session="))!;
    assert.ok(fullCookie);
    return { response, fullCookie, cookie: fullCookie.split(";")[0] };
  };
  return {
    db,
    env,
    req,
    addMember,
    start,
    callback,
    signIn,
    getCalls: () => calls,
    getTransaction: () => transaction,
  };
}

test("Google profile image is persisted, returned in session, and updated on the next login", async () => {
  const identity: GoogleIdentity = {
    sub: "google-123",
    email: "member@example.test",
    picture: "https://lh3.googleusercontent.com/a/avatar-one",
  };
  const s = setup(identity);
  const login = await s.signIn();
  const current = async () =>
    (await (
      await s.req("/api/auth/session", { headers: { Cookie: login.cookie } })
    ).json()) as { user: { avatarUrl: string | null } };
  assert.equal((await current()).user.avatarUrl, identity.picture);
  identity.picture = "https://lh3.googleusercontent.com/a/avatar-two";
  await s.callback(await s.start());
  assert.equal((await current()).user.avatarUrl, identity.picture);
  identity.picture = null;
  await s.callback(await s.start());
  assert.equal((await current()).user.avatarUrl, null);
});

test("profile pictures are optional and restricted to Google HTTPS hosts", () => {
  for (const value of [
    undefined,
    null,
    42,
    "invalid",
    "http://lh3.googleusercontent.com/a",
    "https://googleusercontent.com.evil.test/a",
    "https://evil.test/a",
    "https://user:pass@lh3.googleusercontent.com/a",
    "https://lh3.googleusercontent.com:8443/a",
    "data:image/png;base64,abc",
  ]) {
    assert.equal(googleAvatarUrl(value), null);
  }
  const picture = "https://lh3.googleusercontent.com/a/profile=s96-c";
  const claims = {
    sub: "s",
    email: "x@example.test",
    email_verified: true,
    nonce: "n",
    picture,
  };
  assert.equal(
    identityFromClaims(claims, { GOOGLE_CLIENT_ID: clientId }, "n").picture,
    picture,
  );
  assert.equal(
    identityFromClaims(
      { ...claims, picture: undefined },
      { GOOGLE_CLIENT_ID: clientId },
      "n",
    ).picture,
    null,
  );
});

test("start uses exact Google origin, minimal scopes, state, nonce and PKCE; no secrets in response", async () => {
  const s = setup();
  const flow = await s.start();
  assert.equal(flow.url.origin, "https://accounts.google.com");
  assert.equal(
    flow.url.searchParams.get("redirect_uri"),
    ORIGIN + "/api/auth/callback",
  );
  assert.equal(flow.url.searchParams.get("code_challenge_method"), "S256");
  assert.equal(flow.url.searchParams.get("scope"), "openid email profile");
  assert.ok(!flow.url.href.includes(s.env.GOOGLE_CLIENT_SECRET));
  const tx = s.db
    .prepare("SELECT * FROM oauth_transactions")
    .get() as unknown as Transaction;
  assert.equal(
    tx.state_hash,
    await digest(flow.url.searchParams.get("state")!),
  );
  assert.equal(
    flow.url.searchParams.get("code_challenge"),
    await digest(tx.code_verifier),
  );
  assert.equal(tx.nonce, flow.url.searchParams.get("nonce"));
});

test("OAuth start rejects cross-origin, missing origin, unconfigured secrets and malformed input", async () => {
  const s = setup();
  for (const origin of ["", "https://evil.example"]) {
    assert.equal(
      (
        await s.req("/api/auth/start", {
          method: "POST",
          headers: { Origin: origin },
          body: "{}",
        })
      ).status,
      403,
    );
  }
  assert.equal(
    (
      await s.req("/api/auth/start", {
        method: "POST",
        headers: { Origin: ORIGIN, "Content-Type": "application/json" },
        body: "bad",
      })
    ).status,
    400,
  );
  s.env.GOOGLE_CLIENT_SECRET = "";
  assert.equal(
    (
      await s.req("/api/auth/start", {
        method: "POST",
        headers: { Origin: ORIGIN },
      })
    ).status,
    503,
  );
});

test("callback needs matching state, browser cookie and a non-expired transaction", async () => {
  const s = setup();
  s.addMember();
  const flow = await s.start();
  const missingCookie = await s.req(
    `/api/auth/callback?state=${flow.url.searchParams.get("state")}&code=code`,
  );
  assert.match(missingCookie.headers.get("Location")!, /oauth_expired/);
  assert.equal(s.getCalls(), 0);
  s.db.exec("UPDATE oauth_transactions SET expires_at = 1");
  const expired = await s.callback(flow);
  assert.match(expired.headers.get("Location")!, /oauth_expired/);
  assert.equal(s.getCalls(), 0);
});

test("allowlisted member gets an opaque Secure HttpOnly cookie; only its hash is in D1", async () => {
  const s = setup();
  const auth = await s.signIn();
  assert.equal(auth.response.headers.get("Location"), "/finance/contracts");
  assert.match(auth.fullCookie, /HttpOnly/);
  assert.match(auth.fullCookie, /Secure/);
  assert.match(auth.fullCookie, /SameSite=Lax/);
  assert.match(auth.fullCookie, /Max-Age=604800/);
  const raw = auth.cookie.split("=")[1];
  const stored = s.db.prepare("SELECT token_hash FROM sessions").get()!;
  assert.equal(stored.token_hash, await digest(raw));
  assert.notEqual(stored.token_hash, raw);
  const me = await s.req("/api/auth/session", {
    headers: { Cookie: auth.cookie },
  });
  assert.equal(me.headers.get("Cache-Control"), "no-store");
  const body = (await me.json()) as {
    user: { id: string; name: string };
    csrfToken: string;
  };
  assert.equal(body.user.name, "テスト 太郎");
  assert.equal(body.csrfToken.length, 43);
  assert.equal(
    s.db.prepare("SELECT google_sub FROM members").get()!.google_sub,
    "google-123",
  );
});

test("remember off creates a browser-session cookie and an eight-hour server expiry", async () => {
  const s = setup();
  const auth = await s.signIn(false);
  assert.ok(!auth.fullCookie.includes("Max-Age"));
  assert.ok(!auth.fullCookie.includes("Expires"));
  const ttl = Number(
    s.db.prepare("SELECT expires_at - created_at AS ttl FROM sessions").get()!
      .ttl,
  );
  assert.ok(ttl >= 28798 && ttl <= 28802);
});

test("unregistered, disabled and subject-mismatched members cannot sign in", async () => {
  for (const kind of ["absent", "disabled", "subject-mismatch"]) {
    const s = setup();
    if (kind !== "absent")
      s.addMember(kind === "subject-mismatch" ? "some-other-google-id" : null);
    if (kind === "disabled") s.db.exec("UPDATE members SET is_active = 0");
    const response = await s.callback(await s.start());
    assert.match(response.headers.get("Location")!, /unregistered/);
    assert.equal(
      s.db.prepare("SELECT count(*) AS n FROM sessions").get()!.n,
      0,
    );
  }
});

test("OAuth transaction is one-use and cancelling consumes it", async () => {
  const s = setup();
  s.addMember();
  const flow = await s.start();
  await s.callback(flow);
  assert.match(
    (await s.callback(flow)).headers.get("Location")!,
    /oauth_expired/,
  );
  assert.equal(s.getCalls(), 1);
  const denied = await s.start();
  assert.match(
    (await s.callback(denied, "&error=access_denied")).headers.get("Location")!,
    /access_denied/,
  );
  assert.match(
    (await s.callback(denied)).headers.get("Location")!,
    /oauth_expired/,
  );
});

test("logout requires same-origin and CSRF token and revokes the session in D1", async () => {
  const s = setup();
  const auth = await s.signIn();
  assert.equal(
    (
      await s.req("/api/auth/logout", {
        method: "POST",
        headers: { Cookie: auth.cookie, Origin: ORIGIN },
      })
    ).status,
    403,
  );
  const me = (await (
    await s.req("/api/auth/session", { headers: { Cookie: auth.cookie } })
  ).json()) as { csrfToken: string };
  assert.equal(
    (
      await s.req("/api/auth/logout", {
        method: "POST",
        headers: {
          Cookie: auth.cookie,
          Origin: "https://evil.example",
          "X-CSRF-Token": me.csrfToken,
        },
      })
    ).status,
    403,
  );
  const logout = await s.req("/api/auth/logout", {
    method: "POST",
    headers: {
      Cookie: auth.cookie,
      Origin: ORIGIN,
      "X-CSRF-Token": me.csrfToken,
    },
  });
  assert.equal(logout.status, 200);
  assert.match(logout.headers.get("Set-Cookie")!, /Max-Age=0/);
  assert.equal(
    (await s.req("/api/auth/session", { headers: { Cookie: auth.cookie } }))
      .status,
    401,
  );
});

test("expiry and disabling a member immediately block sessions and protected data", async () => {
  for (const query of [
    "UPDATE members SET is_active = 0",
    "UPDATE sessions SET expires_at = 1",
  ]) {
    const s = setup();
    const auth = await s.signIn();
    assert.equal(
      (await s.req("/api/dashboard", { headers: { Cookie: auth.cookie } }))
        .status,
      200,
    );
    s.db.exec(query);
    assert.equal(
      (await s.req("/api/auth/session", { headers: { Cookie: auth.cookie } }))
        .status,
      401,
    );
    assert.equal(
      (await s.req("/api/dashboard", { headers: { Cookie: auth.cookie } }))
        .status,
      401,
    );
    assert.equal(
      (await s.req("/projects", { headers: { Cookie: auth.cookie } })).status,
      303,
    );
  }
});

test("no API falls back to SPA; client mock storage cannot authorize protected resources", async () => {
  const s = setup();
  assert.equal((await s.req("/api/dashboard")).status, 401);
  assert.equal((await s.req("/api/not-a-route")).status, 404);
  assert.equal((await s.req("/api/auth/start")).status, 405);
  assert.equal((await s.req("/login")).status, 200);
  assert.equal((await s.req("/dashboard?mock=1")).status, 303);
  assert.equal(
    (
      await s.req("/api/auth/session", {
        headers: { Cookie: "__Host-onebe-session=forged" },
      })
    ).status,
    401,
  );
});

test("return URL validation prevents external, protocol-relative, backslash and dot-segment redirects", () => {
  for (const input of [
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "/dashboard/..//evil.example",
    "/dashboard/../../api/auth/logout",
    "/login",
    "/api/auth/logout",
    "/dashboard\nLocation:x",
  ])
    assert.equal(safeReturnTo(input), "/dashboard", input);
  assert.equal(safeReturnTo("/sales/deals?q=hello"), "/sales/deals?q=hello");
  assert.equal(cookieName("session", ORIGIN), "__Host-onebe-session");
  assert.equal(
    cookieName("session", "http://localhost:8787"),
    "onebe-local-session",
  );
});

test("verified email, nonce, authorized party and Workspace domain are enforced", () => {
  const env = {
    GOOGLE_CLIENT_ID: clientId,
    GOOGLE_WORKSPACE_DOMAIN: "example.test",
  };
  const claims = {
    sub: "google-123",
    email: "MEMBER@example.test",
    email_verified: true,
    nonce: "nonce",
    hd: "example.test",
    aud: clientId,
  };
  assert.equal(
    identityFromClaims(claims, env, "nonce").email,
    "member@example.test",
  );
  for (const change of [
    { email_verified: false },
    { nonce: "wrong" },
    { hd: "wrong.test" },
    { azp: "wrong" },
    { aud: [clientId, "other"] },
  ]) {
    assert.throws(() =>
      identityFromClaims({ ...claims, ...change }, env, "nonce"),
    );
  }
});

test("real JOSE verification rejects wrong signature, issuer, audience, expiry and nonce", async () => {
  const s = setup();
  const key = await generateKeyPair("RS256");
  const publicJwk = await exportJWK(key.publicKey);
  const jwks = createLocalJWKSet({ keys: [{ ...publicJwk, kid: "unit" }] });
  const base = {
    nonce: "nonce",
    email: "member@example.test",
    email_verified: true,
    sub: "google-123",
    iss: "https://accounts.google.com",
    aud: clientId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 300,
  };
  const sign = (claims = base) =>
    new SignJWT(claims)
      .setProtectedHeader({ alg: "RS256", kid: "unit" })
      .sign(key.privateKey);
  assert.equal(
    (await verifyGoogleIdToken(await sign(), "nonce", s.env, jwks)).sub,
    "google-123",
  );
  for (const change of [
    { iss: "https://evil.example" },
    { aud: "other" },
    { exp: 1 },
    { nonce: "wrong" },
  ]) {
    await assert.rejects(
      verifyGoogleIdToken(
        await sign({ ...base, ...change }),
        "nonce",
        s.env,
        jwks,
      ),
    );
  }
  const other = await generateKeyPair("RS256");
  const forged = await new SignJWT(base)
    .setProtectedHeader({ alg: "RS256", kid: "unit" })
    .sign(other.privateKey);
  await assert.rejects(verifyGoogleIdToken(forged, "nonce", s.env, jwks));
});
