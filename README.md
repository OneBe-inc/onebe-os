# OneBe OS — Phase 1

OneBeの社内ワークスペース。承認済みのログイン・ダッシュボード画像を基準に、正式ロゴ、ネイビー／ホワイトの配色、余白を活かしたUIを実装しています。

> **現在はUIプレビューです。** Googleログインは明示的なモック認証で、すべての業務データはサンプルです。実アカウント・個人情報・社内機密を入力しないでください。アクセス制御された本番ポータルではありません。

## 起動

Node.js 22.12以降、npmを使用します。

```sh
npm ci
npm run dev
```

`http://127.0.0.1:5173` を開きます。ポート使用中の場合は `npm run dev -- --port 5174`。

「Googleでログイン」→「山田 太郎」でダッシュボードへ進みます。「未登録アカウント」でエラー画面を確認できます。実際のGoogleへの通信はありません。

## 実装済み

- ログイン：正式ロゴ、Mission／Vision、Google風ログイン導線、未登録エラー、ログアウト、元のページへの復帰。
- モックセッション：保持ONは7日間のlocalStorage、OFFはタブ内sessionStorage（最大8時間）。同一ブラウザ内でタスク完了・通知既読を保存。
- アプリシェル：7分類のアコーディオンサイドバー、現在ページ表示、全体検索（Ctrl／⌘+K）、通知、ヘルプ、ユーザーメニュー。
- ダッシュボード：要対応、タスク、Calendar予定領域、進行案件、承認待ち、売上・入金、契約更新、お知らせ。各カードから詳細表示／準備中ページへ移動。
- 社内 → 社内規定：6つのサンプル規定、全文検索、章・条文の目次、規定内検索、カテゴリー別一覧、お気に入り、改定履歴、文字サイズ変更、印刷。共通の全体検索からも該当条文へ移動できます。
- Driveの規定：承認済みフォルダの一覧と原本表示。サーバー側のGoogle認証設定が必要です。未接続・空フォルダ・権限エラーを区別します。設定方法は [Drive接続手順](docs/drive-integration.md) を参照してください。
- 子ページ：`src/navigation.ts`に定義。営業、案件、売上・経理、承認、社内、設定の各ルートを直接開けます。未知のURLはページ未検出表示。
- レスポンシブ：デスクトップ、タブレット、モバイル用ドロワー。
- キーボード操作、ダイアログ、本文スキップ、チャートの読み上げ用テーブル、動きを減らす設定に対応。

## 検証

```sh
npm run check
npm run build
npx playwright install chromium
npm test
```

Playwright + axe-coreでログイン、セッション、子ページ、検索、通知、タスク、モバイル、アクセシビリティを検証します。テストではフルChromiumのheadlessモードを使用します。画面キャプチャはリポジトリの1つ上へ保存されます。テスト結果は `playwright-report/` に出力されます。

## 構成

```text
src/
  App.tsx          認証ガード、共通シェル、検索、詳細表示
  Login.tsx        承認済みデザインのログイン画面
  Dashboard.tsx    ダッシュボードと各カード
  components.tsx  正式ロゴ、アバター、カード、ダイアログ
  navigation.ts   メニュー・子ページ定義
  domain.ts       業務データ型・リポジトリ契約
  policies/       社内規定の閲覧UI、サンプル本文、専用スタイル
  data/
    auth.ts       モック認証アダプター
    mock.ts       サンプルデータ・ローカル状態保存
  styles.css      ブランド、共通、レスポンシブのスタイル
public/brand/     OneBe正式ロゴ
tests/            ブラウザテスト
```

React + TypeScript + ViteのSPAと、規定読み取り用Workerで構成します。外部フォントサービスは使用せず、Noto Sans JP／Noto Serif JPを同梱しています。人物写真はサンプルのイニシャルアバターに置き換えています。

## Cloudflareへの接続準備

確認版はSitesで配信します。`.openai/hosting.json` に配信先を設定しています。公開操作はSites経由で行い、閲覧範囲は所有者のみです。画面内のモック認証とは別に、Sites側のアクセス制御とWorker側の認証確認でDrive APIを保護します。GitHubへのpushだけではSitesは更新されません。

Workers Static Assets用の `wrangler.jsonc` とPages用のSPAリダイレクト設定を同梱しています。**デプロイは自動実行されません。** 公開前に認証とアクセス制御を実装してください。

- Workers: アカウント・対象環境を確認後、`npm run deploy`。
- Pages等に静的画面だけを配信する場合の出力は `dist/client`。Drive読み取りAPIにはWorkerが必要です。
- D1／R2／OAuth／freee／Slack等の秘密情報やリソースは未作成です。

具体的な接続境界・セキュリティ条件は [docs/architecture.md](docs/architecture.md) を参照してください。

## 社内規定の統合

`/internal/policies` は共通シェル内の画面です。`/internal/policies?rule=expenses#article-receipt` のように規定・条文を指定でき、モックログイン後もその場所へ復帰します。お気に入りはユーザーID別のlocalStorageに保存し、他の端末とは同期しません。全体検索（Ctrl／⌘+K）は規定本文も対象です。

サンプル本文は [OneBe-Internal-regulations](https://github.com/OneBe-inc/OneBe-Internal-regulations/tree/b03ab38927287c7bd7c3acd5336b22aa2ceaf9b6) から移植しました。両リポジトリ間の自動同期はありません。Driveの原本表示は `?view=drive` で開きます。Google側の認証情報が未設定の場合は「未接続」と表示します。現在のGoogle風ログイン画面はサンプル用であり、Drive APIの認証根拠にはしません。

`tests/policies.spec.ts` は直接リンクからのログイン復帰、共通検索、規定内検索、一覧・お気に入り、目次、モバイル、印刷レイアウト、アクセシビリティを検証します。

## ブランド素材

`public/brand/onebe-logo.png` はOneBe提供の正式素材です。形状・縦横比を維持し、濃色背景ではCSSで白抜き表示しています。ロゴの権利はOneBeに帰属します。フォントは各パッケージのSIL Open Font Licenseに従います。
