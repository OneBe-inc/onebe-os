import { test } from "node:test";
import assert from "node:assert/strict";
import { decodeJwt, exportPKCS8, generateKeyPair } from "jose";
import { accessToken, DriveReader } from "./drive.ts";
import { policiesApi } from "./api.ts";

const env = {
  POLICIES_AUTH_MODE: "sites",
  POLICIES_APPROVED_FOLDER_ID: "approved_folder_123",
  POLICIES_DRIVE_ID: "shared_drive_123",
  GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON: "set",
};
const folder = {
  id: env.POLICIES_APPROVED_FOLDER_ID,
  mimeType: "application/vnd.google-apps.folder",
  driveId: env.POLICIES_DRIVE_ID,
};
const document = {
  id: "document_123",
  name: "規定",
  mimeType: "application/vnd.google-apps.document",
  parents: [env.POLICIES_APPROVED_FOLDER_ID],
  driveId: env.POLICIES_DRIVE_ID,
  modifiedTime: "2026-09-01T00:00:00Z",
};
const res = (body: unknown, status = 200) => Response.json(body, { status });
function requests(
  handle: (url: URL, init?: RequestInit) => Response | Promise<Response>,
): typeof fetch {
  return ((input: RequestInfo | URL, init?: RequestInit) =>
    Promise.resolve(handle(new URL(String(input)), init))) as typeof fetch;
}
const failFetch = requests(() => {
  throw new Error("must not contact Google");
});
const authenticated = (path: string) =>
  new Request(`https://onebe.example${path}`, {
    headers: { "oai-authenticated-user-id": "site-user-123" },
  });

test("demo session cannot authenticate the Drive API; incomplete setup is explicit", async () => {
  const anonymous = new Request("https://onebe.example/api/policies", {
    headers: { cookie: "onebe:mock-session:v1=demo-yamada" },
  });
  assert.equal((await policiesApi(anonymous, env, failFetch)).status, 401);
  assert.equal(
    (
      await policiesApi(
        authenticated("/api/policies"),
        { ...env, POLICIES_AUTH_MODE: "" },
        failFetch,
      )
    ).status,
    503,
  );
  const missing = { ...env, GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON: undefined };
  const response = await policiesApi(
    authenticated("/api/policies"),
    missing,
    failFetch,
  );
  assert.equal(response.status, 503);
  assert.equal((await response.json()).code, "not_configured");
  assert.match(response.headers.get("cache-control")!, /no-store/);
  assert.deepEqual(
    await (
      await policiesApi(
        authenticated("/api/policies/status"),
        missing,
        failFetch,
      )
    ).json(),
    { configured: false },
  );
});

test("list uses the configured folder, follows pages and excludes drafts and shortcuts", async () => {
  let pages = 0;
  const reader = new DriveReader(
    env,
    "test-token",
    requests((url) => {
      if (url.pathname.endsWith(folder.id)) return res(folder);
      assert.equal(url.searchParams.get("driveId"), env.POLICIES_DRIVE_ID);
      assert.match(
        url.searchParams.get("q")!,
        /'approved_folder_123' in parents/,
      );
      pages++;
      if (!url.searchParams.has("pageToken"))
        return res({
          files: [
            document,
            { ...document, id: "draft_file_123", parents: ["draft_folder"] },
            {
              ...document,
              id: "shortcut_123",
              mimeType: "application/vnd.google-apps.shortcut",
            },
          ],
          nextPageToken: "page-two",
        });
      return res({
        files: [{ ...document, id: "second_file_123", name: "規定2" }],
      });
    }),
  );
  assert.deepEqual(
    (await reader.list()).map((f) => f.id),
    ["document_123", "second_file_123"],
  );
  assert.equal(pages, 2);
});

test("an inaccessible folder and an empty approved folder are different outcomes", async () => {
  const empty = new DriveReader(
    env,
    "test",
    requests((url) =>
      res(url.pathname.endsWith(folder.id) ? folder : { files: [] }),
    ),
  );
  assert.deepEqual(await empty.list(), []);
  const denied = new DriveReader(
    env,
    "test",
    requests(() => res({}, 403)),
  );
  await assert.rejects(denied.list(), { code: "drive_permission_denied" });
});

test("arbitrary file IDs and shortcuts never fetch content", async () => {
  for (const candidate of [
    { ...document, parents: ["draft_folder"] },
    { ...document, mimeType: "application/vnd.google-apps.shortcut" },
    { ...document, trashed: true },
  ]) {
    const reader = new DriveReader(
      env,
      "test",
      requests((url) => {
        assert.ok(!url.pathname.endsWith("/export"));
        return res(url.pathname.endsWith(folder.id) ? folder : candidate);
      }),
    );
    await assert.rejects(reader.content(document.id));
  }
});

test("original text is preserved, including untrusted markup", async () => {
  const original = "第1条\n<script>alert(1)</script>\n金額：1,234円";
  const reader = new DriveReader(
    env,
    "test",
    requests((url) => {
      if (url.pathname.endsWith("/export")) {
        assert.equal(url.searchParams.get("mimeType"), "text/plain");
        return new Response(original);
      }
      return res(url.pathname.endsWith(folder.id) ? folder : document);
    }),
  );
  assert.equal(
    new TextDecoder().decode((await reader.content(document.id)).bytes),
    original,
  );
});

test("moving a document out of approved while reading fails closed", async () => {
  let metadataReads = 0;
  const reader = new DriveReader(
    env,
    "test",
    requests((url) => {
      if (url.pathname.endsWith(folder.id)) return res(folder);
      if (url.pathname.endsWith("/export")) return new Response("private text");
      metadataReads++;
      return res(
        metadataReads === 1
          ? document
          : { ...document, parents: ["draft_folder"] },
      );
    }),
  );
  await assert.rejects(reader.content(document.id), { code: "not_found" });
});

test("PDFs retain bytes and oversized content is rejected", async () => {
  const pdf = new TextEncoder().encode("%PDF-1.4\nfixture");
  const reader = new DriveReader(
    env,
    "test",
    requests((url) => {
      if (url.pathname.endsWith(folder.id)) return res(folder);
      if (url.searchParams.get("alt") === "media") return new Response(pdf);
      return res({ ...document, mimeType: "application/pdf" });
    }),
  );
  assert.deepEqual((await reader.content(document.id)).bytes, pdf);
  const large = new DriveReader(
    env,
    "test",
    requests((url) =>
      res(
        url.pathname.endsWith(folder.id)
          ? folder
          : { ...document, size: "11000000" },
      ),
    ),
  );
  await assert.rejects(large.content(document.id), { code: "file_too_large" });
});

test("service-account assertion is read-only, short lived, and uses fixed Google endpoint", async () => {
  const pair = await generateKeyPair("RS256", { extractable: true });
  const private_key = await exportPKCS8(pair.privateKey);
  const key = JSON.stringify({
    type: "service_account",
    client_email: "reader@test-project.iam.gserviceaccount.com",
    private_key,
    token_uri: "https://attacker.invalid",
  });
  const token = await accessToken(
    { ...env, GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON: key },
    requests((url, init) => {
      assert.equal(url.toString(), "https://oauth2.googleapis.com/token");
      const claims = decodeJwt(
        (init!.body as URLSearchParams).get("assertion")!,
      );
      assert.equal(
        claims.scope,
        "https://www.googleapis.com/auth/drive.readonly",
      );
      assert.equal(claims.aud, "https://oauth2.googleapis.com/token");
      assert.equal(claims.sub, undefined);
      assert.ok(claims.exp! - claims.iat! <= 300);
      return res({ access_token: "temporary-test-token" });
    }),
  );
  assert.equal(token, "temporary-test-token");
});
