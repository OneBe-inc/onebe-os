import { readFileSync } from "node:fs";
import { parse } from "jsonc-parser";
const errors = [];
const config = parse(
  readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8"),
  errors,
  { allowTrailingComma: true },
);
if (errors.length) throw new Error("Invalid wrangler.jsonc configuration.");
const origin = new URL(config.vars.APP_ORIGIN);
if (
  origin.protocol !== "https:" ||
  origin.hostname.endsWith(".invalid") ||
  origin.origin !== config.vars.APP_ORIGIN ||
  !config.vars.GOOGLE_CLIENT_ID?.endsWith(".apps.googleusercontent.com") ||
  !config.d1_databases[0]?.database_id ||
  config.d1_databases[0].database_id === "00000000-0000-0000-0000-000000000000"
) {
  throw new Error(
    "Set the real APP_ORIGIN, GOOGLE_CLIENT_ID and D1 database_id before deployment. See docs/google-auth.md.",
  );
}
console.log(
  "Deployment configuration validated. GOOGLE_CLIENT_SECRET must already exist as a Worker secret.",
);
