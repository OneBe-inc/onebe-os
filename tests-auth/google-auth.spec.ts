import { test, expect } from "@playwright/test";

test("production build has no demo login; missing Google settings show an actionable error", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/login");
  await expect(
    page.getByRole("button", { name: "Googleでログイン", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("UIプレビュー")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Googleでログイン", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "ログインの設定を準備中です" }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("production ignores old fake localStorage sessions and protects direct navigation and API", async ({
  page,
}) => {
  await page.goto("/login");
  await page.evaluate(() =>
    localStorage.setItem(
      "onebe:mock-session:v1",
      JSON.stringify({
        user: { id: "demo-yamada" },
        expires: Date.now() + 9999999,
      }),
    ),
  );
  const response = await page.goto("/finance/contracts");
  expect(response?.status()).toBe(200);
  await expect(page).toHaveURL(/\/login\?returnTo=%2Ffinance%2Fcontracts/);
  await expect(
    page.getByRole("heading", { name: "ログイン", exact: true }),
  ).toBeVisible();
  expect((await page.request.get("/api/dashboard")).status()).toBe(401);
  expect((await page.request.get("/api/not-a-route")).status()).toBe(404);
});

test("OAuth callback errors are displayed without trusting provider text", async ({
  page,
}) => {
  await page.goto("/api/auth/callback?code=invalid&state=invalid");
  await expect(
    page.getByRole("heading", { name: "ログインの有効時間が切れました" }),
  ).toBeVisible();
  await page.goto("/login?error=unregistered");
  await expect(
    page.getByRole("heading", { name: /このアカウントは/ }),
  ).toBeVisible();
});

test("real Worker and local D1 session show the member, survive reload, and revoke on logout", async ({
  page,
  context,
}) => {
  await context.addCookies([
    {
      name: "onebe-local-session",
      value: "T".repeat(43),
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", { name: "おはようございます、認証さん" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "おはようございます、認証さん" }),
  ).toBeVisible();
  expect((await page.request.get("/api/dashboard")).status()).toBe(200);
  await page.locator(".user-button").click();
  await page.getByRole("button", { name: "ログアウト", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect((await page.request.get("/api/auth/session")).status()).toBe(401);
  // Replaying the original browser cookie also fails after D1 revocation.
  expect(
    (
      await page.request.get("/api/auth/session", {
        headers: { Cookie: `onebe-local-session=${"T".repeat(43)}` },
      })
    ).status(),
  ).toBe(401);
});
