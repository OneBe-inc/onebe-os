import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function openPolicies(page: Page, path = "/internal/policies") {
  await page.goto(path);
  await expect(page).toHaveURL(/\/login$/);
  await page
    .getByRole("button", { name: "Googleでログイン", exact: true })
    .click();
  await page
    .getByRole("button", { name: "山田 太郎 登録済みメンバー" })
    .click();
  await expect(
    page.getByRole("heading", { name: "社内規定", exact: true }),
  ).toBeVisible();
}

test("policy deep link survives login and refresh; shared search finds body text", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await openPolicies(page, "/internal/policies?rule=expenses#article-receipt");
  await expect(page).toHaveURL(/\?rule=expenses#article-receipt$/);
  await expect(page.locator("#article-receipt")).toBeFocused();
  await page.reload();
  await expect(page.locator("#article-receipt")).toBeFocused();
  await page.keyboard.press("Control+k");
  await page.getByRole("textbox", { name: "検索キーワード" }).fill("領収書");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /経費精算規程/ })
    .click();
  await expect(page).toHaveURL(/\?rule=expenses#article-request$/);
  await expect(page.locator("#article-request")).toBeFocused();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "• 社内規定", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", { name: "おはようございます、山田さん" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("reader search, table of contents, revision history and print layout", async ({
  page,
}) => {
  await openPolicies(page);
  await page.getByRole("button", { name: "すべての規定を検索" }).click();
  const search = page.getByRole("searchbox", { name: "規定の検索キーワード" });
  await expect(search).toBeFocused();
  await search.fill("zzzz-no-match");
  await expect(page.getByText("0件の規定が見つかりました")).toBeVisible();
  await search.fill("領収書");
  await page.getByRole("button", { name: /第4条.*証憑の保存/ }).click();
  await expect(page.locator("#article-receipt")).toBeFocused();
  await page
    .getByRole("searchbox", { name: "この規定内を検索" })
    .fill("領収書");
  await expect(page.getByText("該当する条文 2件")).toBeVisible();
  await expect(page.locator(".pol-provisions mark")).toHaveCount(2);
  await page
    .getByRole("combobox", { name: "本文の文字サイズ" })
    .selectOption("2");
  await expect(page.locator(".pol-provisions")).toHaveCSS("font-size", "17px");
  await page
    .getByRole("complementary", { name: "この規定の目次" })
    .getByRole("link", { name: /第3条/ })
    .click();
  await expect(page.locator("#article-request")).toBeFocused();
  await page.getByRole("button", { name: "改定履歴", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "経費精算規程の改定履歴" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page.emulateMedia({ media: "print" });
  await expect(
    page.getByRole("complementary", { name: "メインナビゲーション" }),
  ).toBeHidden();
  await expect(page.locator(".pol-tools")).toBeHidden();
  await expect(
    page.getByRole("article", { name: "経費精算規程の本文" }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "デザイン確認用の規定です。会社の正式な規定ではありません。",
    ),
  ).toBeVisible();
});

test("catalog filters and favorites persist and tolerate malformed storage", async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem("seeded")) {
      localStorage.setItem(
        "onebe:policies:favorites:v1:demo-yamada",
        "not json",
      );
      sessionStorage.setItem("seeded", "true");
    }
  });
  await openPolicies(page);
  await page
    .getByRole("button", { name: "就業規則をお気に入りに追加" })
    .click();
  await page.getByRole("link", { name: /お気に入り/ }).click();
  await expect(page.locator(".pol-card")).toHaveCount(1);
  await page.reload();
  await expect(page.locator(".pol-card")).toHaveCount(1);
  await page
    .getByRole("button", { name: "就業規則をお気に入りから削除" })
    .click();
  await expect(page.getByText("該当する規定はありません")).toBeVisible();
  await page.getByRole("link", { name: /規定一覧/ }).click();
  await expect(page.locator(".pol-card")).toHaveCount(6);
  await page
    .getByRole("combobox", { name: "カテゴリー" })
    .selectOption("people");
  await expect(page.locator(".pol-card")).toHaveCount(2);
  await page.getByRole("link", { name: /テレワーク規程/ }).click();
  await expect(
    page.getByRole("article", { name: "テレワーク規程の本文" }),
  ).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("combobox", { name: "カテゴリー" })).toHaveValue(
    "people",
  );
});

test("policies work on desktop and mobile without overflow and meet accessibility checks", async ({
  page,
}, testInfo) => {
  await openPolicies(page);
  await page.evaluate(() => document.fonts.ready);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  const desktop = await page.screenshot({
    path: "../onebe-policies-desktop.png",
    fullPage: true,
  });
  await testInfo.attach("policies-desktop", {
    body: desktop,
    contentType: "image/png",
  });
  for (const width of [360, 390, 768, 1024, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      )
      .toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".pol-toc details")).not.toHaveAttribute(
    "open",
    "",
  );
  await page.getByText("この規定の目次", { exact: true }).click();
  await page
    .getByRole("complementary", { name: "この規定の目次" })
    .getByRole("link", { name: /第5条/ })
    .click();
  await expect(page.locator("#article-information")).toBeFocused();
  await page
    .getByRole("combobox", { name: "閲覧中の規定" })
    .selectOption("security");
  await expect(
    page.getByRole("article", { name: "情報セキュリティ規程の本文" }),
  ).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  const mobile = await page.screenshot({
    path: "../onebe-policies-mobile.png",
    fullPage: true,
  });
  await testInfo.attach("policies-mobile", {
    body: mobile,
    contentType: "image/png",
  });
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
