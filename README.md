# OneBe OS — Phase 1

OneBeの社内ワークスペース。承認済みのログイン・ダッシュボード画像を基準に、正式ロゴ、ネイビー／ホワイトの配色、余白を活かしたUIを実装しています。

> **Cloudflare Workers + D1のGoogle認証を実装しています。** 本番のCloudflareアカウント・Google OAuth・許可メンバーは未設定です。業務データは引き続きサンプルです。接続完了前に本番利用・実データ投入はしないでください。

## 起動

Node.js 22.13以降、npmを使用します。

```sh
npm ci
npm run build
npm run db:local
npm run dev:worker
```

`http://localhost:8787/login` を開きます。Google OAuth未設定の状態ではログインできず、設定案内が表示されます。[Google認証の設定手順](docs/google-auth.md)に従って接続してください。

UIだけを確認する場合は `npm run dev:mock` で起動してください。「Googleでログイン」→「山田 太郎」でサンプル画面へ進みます。このモードは開発用Viteでのみ有効で、本番ビルドでは無効になります。

## 実装済み

- ログイン：正式ロゴ、Mission／Vision、Google風ログイン導線、未登録エラー、ログアウト、元のページへの復帰。
- Google認証：認可コード、PKCE、state・nonce、署名／発行者／宛先／期限検証、登録メンバーの照合。初回認証でGoogleのsubjectを固定。
- セッション：保持ONは7日、OFFはブラウザセッションCookie＋最大8時間。公開環境はSecure／HttpOnly／SameSite Cookieを使用し、D1にハッシュを保存。ログアウトとメンバー無効化で失効。localStorageを認証に使用しません。
- アプリシェル：7分類のアコーディオンサイドバー、現在ページ表示、全体検索（Ctrl／⌘+K）、通知、ヘルプ、ユーザーメニュー。
- ダッシュボード：要対応、タスク、Calendar予定領域、進行案件、承認待ち、売上・入金、契約更新、お知らせ。各カードから詳細表示／準備中ページへ移動。
- 子ページ：`src/navigation.ts`に定義。営業、案件、売上・経理、承認、社内、設定の各ルートを直接開けます。未知のURLはページ未検出表示。
- レスポンシブ：デスクトップ、タブレット、モバイル用ドロワー。
- キーボード操作、ダイアログ、本文スキップ、チャートの読み上げ用テーブル、動きを減らす設定に対応。

## 検証

```sh
npm run check
npm run build
npm run test:auth
npx playwright install chromium
npm test
npm run test:auth:browser
```

NodeテストでOAuth検証とD1相当のSQLを検証します。Playwrightは既存UIと、Cloudflareローカル環境＋隔離したD1による認証をそれぞれ検証します。Google本人の実ログインはOAuth設定後に別途確認が必要です。ブラウザテストにはフルChromiumを使用し、画面キャプチャはリポジトリの1つ上へ、UIテスト結果は `playwright-report/` へ保存します。

## 構成

```text
src/
  App.tsx          認証ガード、共通シェル、検索、詳細表示
  Login.tsx        承認済みデザインのログイン画面
  Dashboard.tsx    ダッシュボードと各カード
  components.tsx  正式ロゴ、アバター、カード、ダイアログ
  navigation.ts   メニュー・子ページ定義
  domain.ts       業務データ型・リポジトリ契約
  data/
    auth.ts       サーバーセッションとGoogleログイン開始
    mock-auth.ts  開発用のみのモック認証
    mock.ts       認証付きサンプルAPI・ローカルUI状態
    fixtures.ts   サンプルデータ
  styles.css      ブランド、共通、レスポンシブのスタイル
public/brand/     OneBe正式ロゴ
tests/            ブラウザテスト
server/           Workers認証・セッション・保護API・認証テスト
migrations/       D1スキーマ
tests-auth/       Workers + D1のブラウザ結合テスト
```

React + TypeScript + Viteの静的SPAです。外部フォントサービスは使用せず、Noto Sans JP／Noto Serif JPを同梱しています。人物写真はサンプルのイニシャルアバターに置き換えています。参考画像の仮のリングマークや山岳画像は使用していません。契約更新は必須要件のため最下段に追加しています。

## Cloudflareへの接続準備

認証WorkerとStatic Assetsを同一オリジンに配置します。`run_worker_first: true` により、保護ページとAPIは先に認証を確認します。**デプロイは自動実行されません。** 設定が空の場合はデプロイを中止します。Pagesへの静的アップロードだけでは認証APIが動かないため、Workers構成を使用してください。

- Workers: [設定手順](docs/google-auth.md)に沿ってアカウント・D1・OAuth・許可メンバーを準備後、`npm run deploy`。
- ローカルD1での検証は完了しています。本番D1・OAuthクライアント・Worker秘密情報は未設定です。
- Calendar／Drive／R2／freee／Slack等の業務連携は未接続です。

具体的な接続境界・セキュリティ条件は [docs/architecture.md](docs/architecture.md) を参照してください。

## ブランド素材

`public/brand/onebe-logo.png` はOneBe提供の正式素材です。形状・縦横比を維持し、濃色背景ではCSSで白抜き表示しています。ロゴの権利はOneBeに帰属します。フォントは各パッケージのSIL Open Font Licenseに従います。
