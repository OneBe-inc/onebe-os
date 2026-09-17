// Uses only an isolated local D1 directory. Never run these fixtures remotely.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
const wrangler = fileURLToPath(
  new URL("../node_modules/wrangler/bin/wrangler.js", import.meta.url),
);
const args = [
  "--env",
  "local",
  "--local",
  "--persist-to",
  ".wrangler/auth-browser",
];
execFileSync(
  process.execPath,
  [wrangler, "d1", "migrations", "apply", "DB", ...args],
  { stdio: "inherit" },
);
const hash = createHash("sha256").update("T".repeat(43)).digest("base64url");
const expires = Math.floor(Date.now() / 1000) + 3600;
const sql = `DELETE FROM sessions WHERE member_id = 'auth-browser-fixture';
  INSERT INTO members (id, email, name, department, is_active) VALUES ('auth-browser-fixture', 'browser-fixture@example.test', '認証 テスト', '検証用', 1)
  ON CONFLICT(id) DO UPDATE SET is_active = 1;
  INSERT INTO sessions (token_hash, member_id, csrf_token, expires_at) VALUES ('${hash}', 'auth-browser-fixture', 'test-csrf-fixture', ${expires});`;
execFileSync(
  process.execPath,
  [wrangler, "d1", "execute", "DB", ...args, "--command", sql],
  { stdio: "inherit" },
);
