import {
  createRemoteJWKSet,
  jwtVerify,
  type JWTPayload,
  type JWTVerifyGetKey,
} from "jose";
import type { Env, GoogleIdentity, Transaction } from "./types";

const keys = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs"),
  { timeoutDuration: 8000 },
);

export function identityFromClaims(
  claims: JWTPayload,
  env: Pick<Env, "GOOGLE_WORKSPACE_DOMAIN" | "GOOGLE_CLIENT_ID">,
  nonce: string,
): GoogleIdentity {
  if (
    claims.nonce !== nonce ||
    claims.email_verified !== true ||
    typeof claims.email !== "string" ||
    !claims.email.includes("@") ||
    typeof claims.sub !== "string" ||
    claims.sub.length === 0 ||
    claims.sub.length > 255 ||
    (claims.azp !== undefined && claims.azp !== env.GOOGLE_CLIENT_ID) ||
    (Array.isArray(claims.aud) &&
      claims.aud.length > 1 &&
      claims.azp !== env.GOOGLE_CLIENT_ID) ||
    (env.GOOGLE_WORKSPACE_DOMAIN &&
      claims.hd !== env.GOOGLE_WORKSPACE_DOMAIN.toLowerCase())
  )
    throw new Error("INVALID_IDENTITY");
  return { sub: claims.sub, email: claims.email.toLowerCase() };
}

export async function verifyGoogleIdToken(
  idToken: string,
  nonce: string,
  env: Env,
  jwks: JWTVerifyGetKey = keys,
): Promise<GoogleIdentity> {
  const { payload } = await jwtVerify(idToken, jwks, {
    algorithms: ["RS256"],
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: env.GOOGLE_CLIENT_ID,
    requiredClaims: ["sub", "exp", "iat", "nonce", "email", "email_verified"],
    maxTokenAge: "10m",
    clockTolerance: 5,
  });
  return identityFromClaims(payload, env, nonce);
}

export async function exchangeGoogleCode(
  code: string,
  tx: Transaction,
  env: Env,
  origin: string,
): Promise<GoogleIdentity> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      code,
      code_verifier: tx.code_verifier,
      grant_type: "authorization_code",
      redirect_uri: `${origin}/api/auth/callback`,
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error("TOKEN_EXCHANGE_FAILED");
  const result = (await response.json()) as { id_token?: unknown };
  if (typeof result.id_token !== "string") throw new Error("MISSING_ID_TOKEN");
  // No access/refresh/ID token is persisted or sent to the browser.
  return verifyGoogleIdToken(result.id_token, tx.nonce, env);
}
