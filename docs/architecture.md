# Phase 1からの拡張方針

## 現在の境界

社内規定のDrive閲覧APIを `server/` に追加しました。Sitesの信頼済み認証ヘッダーと公開範囲を用い、Googleとの接続はサーバーのみで処理します。承認済みフォルダの都度読み取りを実装済みですが、Google認証情報は別途設定が必要です。詳細は [Drive連携](drive-integration.md) を参照してください。DB同期や会社全体の本番Googleログインは未実装です。

UIとデータは分離しています。`domain.ts` の型を画面が利用し、`data/mock.ts` がデータを供給します。認証は `AuthService` と `data/auth.ts` に集約しています。将来のAPIや外部連携にブラウザから直接接続しない方針です。

現在のタスク・通知保存は同期のブラウザ保存です。D1へ移す段階でリポジトリの読み書きを非同期にし、保存中・失敗・再試行・競合の状態をUIに追加します。現段階で外部連携が動くという意味ではありません。

## 接続する順序

1. **Google Workspace認証とメンバーDB**：WorkersでOAuthの開始／コールバック、state・nonce・PKCE、IDトークン検証、D1メンバー照合、権限検証、失効可能なHttpOnly／Secure／SameSiteセッションを実装。ドメインが一致するだけで登録済み扱いにしない。
2. **D1**：ユーザー、所属・役割、企業、人物、案件、タスク、承認、通知・既読、操作履歴をmigrationで管理。ユーザー・組織・権限の絞り込みはサーバー側で実施する。
3. **Google Calendar／Drive**：Workers側で最小スコープとユーザー同意を取得。トークンをブラウザやリポジトリに保存しない。予定の時刻はISO 8601とタイムゾーンで扱い、権限喪失・期限切れ・同期失敗・空データを区別する。
4. **R2**：ファイル本体は非公開バケット、D1にメタデータとアクセス権を保管。署名付きURLの発行前に認可し、有効期限・サイズ・種類制限と監査ログを設ける。
5. **freee**：サーバー間OAuth、入金・請求の読み取りから開始。再取得・失敗・重複を考慮し、金額は円単位の整数、集計対象期間と更新時刻を明示。UIの金額は現在サンプルの万円単位。
6. **Slack／OpenClaw**：通知アダプターを業務更新と分離する。署名検証、最小権限、キュー／冪等性、監査、再試行、送信先の許可リストを追加。通知本文に機密情報を不用意に載せない。

## 推奨API境界（設計案・未実装）

| 境界 | 用途 |
| --- | --- |
| `/api/auth/*` | Google認証、セッション、ログアウト |
| `/api/me` | 登録状態・プロフィール・権限 |
| `/api/dashboard` | 閲覧権限で絞った集計、読み込み状態、更新時刻 |
| `/api/tasks/:id` | タスク更新、楽観ロック／競合検知 |
| `/api/notifications/*` | ユーザー単位の通知と既読 |
| `/api/integrations/*` | Calendar、Drive、freee、Slack等の連携制御 |

`/api/policies` と `/api/policies/:id/content` をWorkerで処理します。APIの404や認証エラーにはJSONを返し、画面のSPAフォールバックと分離しています。D1・R2 bindingやOAuth secretsは公開環境と検証環境で分離します。

## 本番化前の必須条件

- モック認証とサンプルデータを外し、サーバー認証・認可を実装する。
- ログイン保持のUXとサーバーセッションの有効期限を定義する。localStorageを認証根拠にしない。
- 秘密情報はCloudflare Secretsなどで管理し、`VITE_*`やフロントエンドコードに置かない。
- プレビューと本番環境を分離し、実データを公開プレビューへ入れない。
- CSRF、XSS、レート制限、CSP、監査、バックアップ、データ保持期間を確認する。
- 担当者の実際の権限で承認・会計・ファイル公開範囲を検証する。Phase 1には承認実行・支払い・外部送信機能はない。

## 設計参照

- [Cloudflare React構成](https://developers.cloudflare.com/workers/framework-guides/web-apps/react/)
- [Static AssetsのSPAルーティング](https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/)
