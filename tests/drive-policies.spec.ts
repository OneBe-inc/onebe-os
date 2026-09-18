import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function login(page: Page) {
  await page.goto("/internal/policies?view=drive");
  await page
    .getByRole("button", { name: "Googleでログイン", exact: true })
    .click();
  await page
    .getByRole("button", { name: "山田 太郎 登録済みメンバー" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Driveの規定", exact: true }),
  ).toBeVisible();
}
test("Drive setup, empty and error states never fall back to sample content", async ({
  page,
}) => {
  let mode = "setup";
  await page.route("**/api/policies", (route) =>
    route.fulfill({
      status: mode === "empty" ? 200 : 503,
      contentType: "application/json",
      body: JSON.stringify(
        mode === "empty"
          ? { files: [], fetchedAt: "2026-09-18T00:00:00Z" }
          : { code: mode === "setup" ? "not_configured" : "connection_failed" },
      ),
    }),
  );
  await login(page);
  await expect(
    page.getByRole("heading", { name: "Google Drive 未接続" }),
  ).toBeVisible();
  await expect(
    page.getByRole("article", { name: "就業規則の本文" }),
  ).toHaveCount(0);
  mode = "empty";
  await page.getByRole("button", { name: "一覧を更新" }).click();
  await expect(
    page.getByRole("heading", { name: "承認済みの規定はまだありません" }),
  ).toBeVisible();
  mode = "error";
  await page.getByRole("button", { name: "一覧を更新" }).click();
  await expect(
    page.getByRole("heading", { name: "規定を読み込めませんでした" }),
  ).toBeVisible();
});
test("Drive documents display their original text safely and links survive reload", async ({
  page,
}) => {
  const file = {
    id: "document_123",
    name: "テスト用の規定",
    format: "document",
    modifiedTime: "2026-09-18T00:00:00Z",
  };
  await page.route("**/api/policies", (r) =>
    r.fulfill({ json: { files: [file], fetchedAt: "2026-09-18T00:00:00Z" } }),
  );
  await page.route("**/api/policies/document_123/content", (r) =>
    r.fulfill({
      json: {
        ...file,
        text: "第1条\n<script>alert('bad')</script>\n原文そのまま。",
      },
    }),
  );
  await login(page);
  await page.getByRole("button", { name: "テスト用の規定" }).click();
  await expect(page).toHaveURL(/view=drive&file=document_123/);
  await expect(page.locator(".drive-text")).toContainText(
    "<script>alert('bad')</script>",
  );
  await expect(page.locator(".drive-text script")).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".drive-text")).toContainText("原文そのまま。");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
