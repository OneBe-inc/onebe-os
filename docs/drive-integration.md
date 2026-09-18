# Google Drive規定閲覧の接続設定

## 実装した範囲

OneBeOSの「Driveの規定」は、サーバーから承認済みフォルダの直下を読み取ります。本文やGoogleのトークンはビルド成果物・Git・localStorageに保存しません。原本の編集・移動・承認操作は行いません。

- Googleドキュメント：テキストとして原文を表示。表の罫線や書式は再現しません。
- PDF：原本を表示。上限10MB。
- Word等：一覧に「本文表示未対応」と表示。管理者が原本を確認したうえで対応形式を用意します。
- ショートカットとサブフォルダは辿りません。
- 閲覧のたびに所属フォルダ・共有ドライブ・ゴミ箱状態を確認し、取得中の移動や更新も再確認します。
- 同期DB、全文検索インデックス、Drive版のお気に入り・既読管理は未実装です。現時点では都度読み取りです。

未接続・空フォルダ・権限エラーを区別し、実データ取得失敗時にサンプルを代わりに出しません。サンプル規定は別の画面に残しています。Google Driveのフォルダ配置を公開承認の基準とするため、接続前に承認済みフォルダの編集者を確認してください。

## 接続に必要なGoogle側の設定

1. OneBeが管理するGoogle CloudプロジェクトでGoogle Drive APIを有効にします。
2. 規定読み取り専用のサービスアカウントを用意します。ドメイン全体の委任は使いません。
3. サービスアカウントに「承認済み」フォルダの閲覧権限を付けます。組織の共有制限で追加できない場合は、共有ドライブ全体を安易に公開せず管理者が方式を確認します。
4. サービスアカウントのJSONキーをSitesのサーバー用Secret `GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON` に設定します。チャット、公開GitHub、ブラウザ設定欄へ貼り付けません。
5. 下記設定を揃えて再公開し、実際の空フォルダ・表示対象の文書を確認します。キーは利用可能なSecret管理経路で管理者が設定します。

| サーバー設定 | 用途 |
|---|---|
| `POLICIES_AUTH_MODE=sites` | Sitesの信頼済み認証プロキシ配下でのみ有効 |
| `POLICIES_APPROVED_FOLDER_ID` | 承認済みフォルダID。クライアントから変更不可 |
| `POLICIES_DRIVE_ID` | 許可する共有ドライブID |
| `GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON` | 読み取り専用サービスアカウントの秘密情報 |

Sitesのアクセス範囲は所有者のみを維持しています。`oai-authenticated-user-id` はSitesが付与するサーバー側の認証情報です。画面内のGoogle風デモログイン、リクエストのCookieやユーザーIDパラメーターを認証根拠にしません。Sites以外へ配信するときは、任意の利用者が認証ヘッダーを指定できない実認証・認可を先に実装し、それまでは `POLICIES_AUTH_MODE` を未設定にします。

## 開発・検証

`npm run build` は `dist/client` と `dist/server/index.js` を作成します。`npm run test:server` は実Driveを使わず、認証拒否・承認フォルダ以外の排除・ページ送り・取得中の移動・容量制限を検証します。`npm test` は画面の状態分岐も検証します。Vite開発サーバー単独には実Drive APIがなく、画面テストではAPIレスポンスを差し替えます。

## 仕様参照

- [Googleのサーバー間認証](https://developers.google.com/identity/protocols/oauth2/service-account)
- [Drive一覧取得](https://developers.google.com/workspace/drive/api/reference/rest/v3/files/list)
- [Googleドキュメントのエクスポート](https://developers.google.com/workspace/drive/api/reference/rest/v3/files/export)
