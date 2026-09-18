import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { navigation } from "../src/navigation";

const sessionKey = "onebe:mock-session:v1";
async function login(page: Page, remember = true) {
  await page.goto("/login");
  await page
    .getByRole("checkbox", { name: "ログイン状態を保持する" })
    .setChecked(remember);
  await page
    .getByRole("button", { name: "Googleでログイン", exact: true })
    .click();
  await page
    .getByRole("button", { name: "山田 太郎 登録済みメンバー" })
    .click();
  await expect(
    page.getByRole("heading", { name: "おはようございます、山田さん" }),
  ).toBeVisible();
}

test("remembered login, reload, logout and protected routes", async ({
  page,
}) => {
  await page.goto("/finance/contracts");
  await expect(page).toHaveURL(/\/login$/);
  await page
    .getByRole("button", { name: "Googleでログイン", exact: true })
    .click();
  await page
    .getByRole("button", { name: "山田 太郎 登録済みメンバー" })
    .click();
  await expect(page).toHaveURL(/\/finance\/contracts$/);
  await expect(
    page.getByRole("heading", { name: "契約", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page).toHaveURL(/\/finance\/contracts$/);
  expect(
    await page.evaluate((key) => !!localStorage.getItem(key), sessionKey),
  ).toBe(true);
  await page.locator(".user-button").click();
  await page.getByRole("button", { name: "ログアウト", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect(
    await page.evaluate(
      (key) => localStorage.getItem(key) ?? sessionStorage.getItem(key),
      sessionKey,
    ),
  ).toBeNull();
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);
});

test("session-only login survives reload but is not stored persistently", async ({
  page,
  context,
}) => {
  await login(page, false);
  expect(
    await page.evaluate((key) => localStorage.getItem(key), sessionKey),
  ).toBeNull();
  expect(
    await page.evaluate((key) => !!sessionStorage.getItem(key), sessionKey),
  ).toBe(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "おはようございます、山田さん" }),
  ).toBeVisible();
  const separateTab = await context.newPage();
  await separateTab.goto("/dashboard");
  await expect(separateTab).toHaveURL(/\/login$/);
});

test("unregistered account error and retry", async ({ page }) => {
  await page.goto("/login");
  await page
    .getByRole("button", { name: "Googleでログイン", exact: true })
    .click();
  await page
    .getByRole("button", { name: "未登録アカウント エラー画面を確認" })
    .click();
  await expect(
    page.getByRole("heading", { name: /このアカウントは/ }),
  ).toBeVisible();
  expect(
    await page.evaluate((key) => localStorage.getItem(key), sessionKey),
  ).toBeNull();
  await page
    .getByRole("button", { name: "別のGoogleアカウントでログイン" })
    .click();
  await page
    .getByRole("button", { name: "山田 太郎 登録済みメンバー" })
    .click();
  await expect(page).toHaveURL(/\/dashboard$/);
});

test("expired or malformed sessions are rejected", async ({ page }) => {
  await page.goto("/login");
  for (const value of [
    "broken",
    JSON.stringify({ user: { id: "demo-yamada" } }),
    JSON.stringify({ user: { id: "demo-yamada" }, expires: 1 }),
  ]) {
    await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
      key: sessionKey,
      value,
    });
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login$/);
  }
});

test("task completion updates counts and survives reload", async ({ page }) => {
  await login(page);
  await expect(
    page.getByRole("button", { name: /今日のタスク 8件/ }),
  ).toBeVisible();
  await page
    .getByRole("checkbox", { name: "提案資料の作成（株式会社ABC）" })
    .check();
  await expect(
    page.getByRole("button", { name: /今日のタスク 7件/ }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("checkbox", { name: "提案資料の作成（株式会社ABC）" }),
  ).toBeChecked();
  await page.getByRole("button", { name: /今日のタスク 7件/ }).click();
  await expect(page.getByRole("dialog").getByRole("checkbox")).toHaveCount(8);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("accordion, active link, all planned child routes and missing page", async ({
  page,
}) => {
  await login(page);
  const sales = page.getByRole("button", { name: "営業", exact: true });
  await expect(sales).toHaveAttribute("aria-expanded", "true");
  await sales.click();
  await expect(sales).toHaveAttribute("aria-expanded", "false");
  await sales.click();
  await page.getByRole("link", { name: "• 商談", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "• 商談", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  for (const group of navigation) {
    for (const [title, path] of group.children) {
      await page.goto(path);
      await expect(
        page.getByRole("heading", { name: title, exact: true }),
      ).toBeVisible();
      if (path === "/internal/policies") {
        await expect(
          page.getByRole("article", { name: "就業規則の本文" }),
        ).toBeVisible();
      } else {
        await expect(
          page.getByText("このページは準備中です。", { exact: true }),
        ).toBeVisible();
      }
    }
  }
  await page.goto("/not-a-page");
  await expect(
    page.getByText("お探しのページは見つかりませんでした。"),
  ).toBeVisible();
});

test("keyboard search, empty result, project navigation", async ({ page }) => {
  await login(page);
  await page.keyboard.press("Control+k");
  const input = page.getByRole("textbox", { name: "検索キーワード" });
  await expect(input).toBeFocused();
  await input.fill("zzzz-none");
  await expect(
    page.getByText("「zzzz-none」に一致する結果はありません"),
  ).toBeVisible();
  await input.fill("abc");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /株式会社ABC コーポレートサイトリニューアル/ })
    .click();
  await expect(page).toHaveURL(/\/projects\/abc$/);
  await expect(
    page.getByRole("heading", { name: "コーポレートサイトリニューアル" }),
  ).toBeVisible();
});

test("notifications, unread persistence and detail dialogs", async ({
  page,
}) => {
  await login(page);
  await page.getByRole("button", { name: "通知 3件の未読" }).click();
  await page
    .getByRole("region", { name: "通知", exact: true })
    .getByRole("button", { name: /10月の全社ミーティングについて/ })
    .click();
  await expect(
    page.getByRole("dialog", { name: "10月の全社ミーティングについて" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "通知 2件の未読" }).click();
  await page.getByRole("button", { name: "すべて既読" }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "通知 0件の未読" }),
  ).toBeVisible();
  for (const [pattern, title, count] of [
    [/要対応 12件/, "要対応", 12],
    [/本日の予定 5件/, "本日の予定", 5],
    [/承認待ち 3件/, "承認待ち", 3],
  ] as const) {
    await page.getByRole("button", { name: pattern }).click();
    const dialog = page.getByRole("dialog", { name: title, exact: true });
    await expect(dialog.locator(".detail-list > *")).toHaveCount(count);
    await page.keyboard.press("Escape");
  }
});

test("desktop visual capture and browser errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto("/login");
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: "../onebe-login-desktop.png", fullPage: true });
  await login(page);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: "../onebe-dashboard-desktop.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("mobile and tablet layout, drawer navigation and visual capture", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login");
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: "../onebe-login-mobile.png", fullPage: true });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await login(page);
  await page.screenshot({
    path: "../onebe-dashboard-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "メニューを開く" }).click();
  await page.getByRole("link", { name: "• 人物・名刺" }).click();
  await expect(page.getByRole("heading", { name: "人物・名刺" })).toBeVisible();
  for (const width of [360, 390, 768, 1024, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/dashboard");
    await expect(
      page.getByRole("heading", { name: "おはようございます、山田さん" }),
    ).toBeVisible();
    if (width > 760)
      await expect(
        page.getByRole("button", { name: "営業", exact: true }),
      ).toBeVisible();
    else
      await expect(
        page.getByRole("button", { name: "営業", exact: true }),
      ).not.toBeVisible();
    const overflowing = await page.evaluate(() =>
      [...document.querySelectorAll("body *")]
        .filter(
          (el) =>
            el.getBoundingClientRect().right > innerWidth + 1 &&
            el.getBoundingClientRect().width > 0,
        )
        .map((el) => ({
          tag: el.tagName,
          className: el.className,
          right: el.getBoundingClientRect().right,
        })),
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `overflow at ${width}: ${JSON.stringify(overflowing)}`,
    ).toBe(true);
  }
});

test("automated accessibility checks for login and dashboard", async ({
  page,
}) => {
  await page.goto("/login");
  const loginAudit = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(loginAudit.violations).toEqual([]);
  await login(page);
  const dashboardAudit = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(dashboardAudit.violations).toEqual([]);
});
