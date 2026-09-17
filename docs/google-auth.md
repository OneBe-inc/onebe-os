# Googleログイン — Cloudflare設定手順

## 実装済み／未完了の区別

実装済み: WorkersのOAuth開始・コールバック、Google IDトークンの検証、D1メンバー照合、セッション発行・確認・失効、CSRF対策、保護API、ログインUI。UIとサーバーのテストを用意しています。

2026年9月18日接続済み: Cloudflare認証、本番D1、Google Cloudの専用プロジェクト `onebe-os`、社内限定OAuthクライアント、許可メンバー登録、Worker Secrets、本番公開。

公開URL: https://onebe-os.issei-masuya.workers.dev/login

確認済み: 公開ログイン画面、Googleのアカウント選択画面への遷移、保護ページのログインへの転送、保護APIの401、別オリジンからのログイン開始の403。Googleアカウント本人によるログイン完了・ログアウト確認は別途必要です。

以下は再構築・設定変更時の手順です。既存のDBやクライアントを重複作成しないでください。

## 1. Cloudflareの接続と公開URL

管理者の環境で実行します。

```sh
npx wrangler login
npx wrangler whoami
npx wrangler d1 create onebe-os-auth
```

対象アカウントを確認し、作成結果のdatabase_idを `wrangler.jsonc` のトップレベル `d1_databases[0].database_id` に設定します。既存の本番DBへ誤って適用しないでください。公開URL（HTTPSのカスタムドメインまたはWorkers URL）を決め、`vars.APP_ORIGIN` を末尾スラッシュなしで設定します。ルート／ドメインは対象所有者の確認後に設定してください。

## 2. Google OAuthクライアント

会社管理のGoogle CloudプロジェクトでGoogle Auth Platformを設定し、種類「ウェブアプリケーション」のOAuthクライアントを作成します。Workspace内部向けにできる場合は内部アプリとし、それ以外では許可されたテストユーザー／公開状態を管理者が確認します。

承認済みリダイレクトURIは、正確に次の形です。

```text
https://<OneBe OSの公開ホスト>/api/auth/callback
```

`GOOGLE_CLIENT_ID` を `wrangler.jsonc` の `vars` に設定します。クライアントIDは公開識別子ですが、クライアントシークレットは公開してはいけません。次のコマンドの対話入力、またはCloudflare DashboardのWorker Secretsから登録してください。

```sh
npx wrangler secret put GOOGLE_CLIENT_SECRET
```

シークレットはチャット、Git、`VITE_*`、スクリーンショットへ載せないでください。ドメイン制限も必要な場合だけ、`GOOGLE_WORKSPACE_DOMAIN` に確認済みWorkspaceドメインを設定します。この場合、メールアドレス末尾ではなくGoogleの検証済み `hd` claimを照合します。ドメイン一致だけでは入れず、次項のメンバー登録も必須です。

## 3. D1スキーマと許可メンバー

対象DBのID・アカウントを確認してから適用します。

```sh
npx wrangler d1 migrations apply DB --remote
```

Cloudflare Dashboardの対象D1のコンソールで、許可するメンバーだけを登録します。以下はテンプレートであり、実在するメンバー情報ではありません。値は実際の情報に置き換え、引用符はSQLとして適切にエスケープしてください。

```sql
INSERT INTO members (id, email, name, department)
VALUES ('<一意のメンバーID>', '<許可メール>', '<表示名>', '<部署>');
```

自動登録はしません。メールアドレスをGoogleが検証済みであることを確認し、初回成功時にGoogleの安定識別子 `sub` を記録します。その後は別のGoogleアカウントが同じメールアドレスを示しても許可しません。アカウントの引き継ぎ時に `google_sub` を消す作業は本人・管理者確認を伴う別作業です。

メンバーを無効化すると既存セッションも次回のサーバーアクセスから拒否されます。

```sql
UPDATE members SET is_active = 0 WHERE id = '<対象ID>';
DELETE FROM sessions WHERE member_id = '<対象ID>';
```

## 4. 公開と確認

SPAへのフォールバックは `assets.not_found_handling: "single-page-application"` を使用します。`public/_redirects` の `/* /index.html 200` はWorkersでループとして拒否されるため配置しません。認証判定は `run_worker_first: true` を維持します。プレビューURLは無効化し、認証の戻り先は本番URLに限定しています。

```sh
npm ci
npm run build
npm run test:auth
npm test
npm run test:auth:browser
npm run deploy
```

`npm run deploy` は未設定のURL／クライアントID／DB IDを検知すると中止します。secretとD1メンバーの実在は管理者が確認してください。Google OAuthのリダイレクトURIと公開オリジンが完全一致する必要があります。接続後は管理者本人のブラウザで次を確認します。

- 許可済みGoogleアカウントでログインし、登録済みの表示名が出る。
- 未登録アカウント・キャンセル・再試行で適切な画面になる。
- 更新してもログインを維持し、ログアウト後は保護APIを取得できない。
- 保持ONは7日間、OFFはブラウザセッションCookie＋サーバー上限8時間。ブラウザのセッション復元設定によってはOFFのCookieも復元されるため「タブを閉じた瞬間に失効」とは扱わない。
- 退職・無効化したメンバーは既存Cookieでもアクセスできない。

## 開発とテスト

通常の本認証ローカル検証は `npm run db:local` と `npm run dev:worker` を使い、`http://localhost:8787` を開きます。ローカルGoogleログインも確認する場合は、Googleクライアントに `http://localhost:8787/api/auth/callback` を追加し、`env.local.vars.GOOGLE_CLIENT_ID` とGit無視の `.dev.vars.local` に `GOOGLE_CLIENT_SECRET` を設定します。ローカルD1にも確認済みメンバーが必要です。

`npm run dev` はフロント開発用です。APIを8787へ転送しますが、認証のオリジン確認があるため、実OAuth検証は上記Workerの同一オリジンで行ってください。UI単独の確認には `npm run dev:mock` を使います。本番ビルドではモック認証を無効化し、旧localStorageセッションやURLパラメータを信用しません。

認証ブラウザテストは `.wrangler/auth-browser` に隔離したローカルD1と架空メンバーを使います。実Googleの同意画面を自動承認したり、本番DBにテストメンバーを作ったりはしません。

## セキュリティと運用

- 認可コード＋PKCE S256、ブラウザに紐づく一回限りのstate（10分）、nonceを使用。
- joseでGoogle公開鍵のRS256署名、issuer、audience、expiration、issued-at、nonce、email_verified、必要に応じhdを検証。
- Googleのaccess／refresh／IDトークンは永続保存せず、ブラウザへ渡さない。Calendar／Drive権限も要求しない。
- 公開セッションCookieは `__Host-`、Secure、HttpOnly、SameSite=Lax、Path=/。生のセッショントークンはD1へ保存せずSHA-256ハッシュだけを保存。
- POSTは同一Originを要求し、ログアウトにはセッション固有のCSRFトークンも必要。
- API／保護ページはWorkerを先に通し、レスポンスはno-store。APIの404をHTMLへフォールバックしない。
- 認証・DB障害時はfail-closed。クライアント側モックへの自動切替は行わない。
- Workerのリクエストログは初期状態で無効。認証コード・Cookie・秘密情報をログに記録しない。運用監査を追加する場合は機密値を除外する。
- 公開時はCloudflare側で `/api/auth/start` と `/api/auth/callback` のレート制限を設定する。既存の認証エンドポイントを意図せずキャッシュしない。
- 期限切れのOAuth処理・セッションは新しいログイン開始時に削除。利用量に応じて定期削除・監査・D1バックアップを追加する。
- 現段階の認可は「有効メンバーかどうか」。承認・会計等の業務権限は未実装で、業務データもサンプルのまま。

## 一次資料

- [Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect)
- [Cloudflare Worker-firstルーティング](https://developers.cloudflare.com/workers/static-assets/routing/worker-script/)
- [Cloudflare D1 prepared statements](https://developers.cloudflare.com/d1/worker-api/prepared-statements/)
- [jose](https://github.com/panva/jose)
