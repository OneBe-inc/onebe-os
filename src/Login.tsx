import { useState } from "react";
import { AlertCircle, ArrowLeft, UserRound } from "lucide-react";
import { Brand, GoogleMark, Modal } from "./components";
export function Login({
  signIn,
}: {
  signIn: (account: "member" | "unregistered", remember: boolean) => void;
}) {
  const [remember, setRemember] = useState(true);
  const [picker, setPicker] = useState(false);
  const [error, setError] = useState("");
  const choose = (account: "member" | "unregistered") => {
    try {
      signIn(account, remember);
    } catch (e) {
      setPicker(false);
      setError(
        e instanceof Error && e.message === "UNREGISTERED"
          ? "unregistered"
          : "storage",
      );
    }
  };
  return (
    <div className="login-page">
      <section className="login-brand-panel">
        <Brand light />
        <div className="mission-vision">
          <section>
            <span className="eyebrow">MISSION</span>
            <h1>
              本気の想いを、
              <br />
              本気で伝える。
            </h1>
          </section>
          <section>
            <span className="eyebrow">VISION</span>
            <p>本気の仕事であふれる社会の実現。</p>
          </section>
        </div>
        <span className="company-signature">株式会社OneBe</span>
      </section>
      <section className="login-form-panel">
        <div className="login-form">
          <p className="login-kicker">OneBe OS</p>
          {error ? (
            <>
              <AlertCircle className="login-error-icon" size={30} />
              <h2 className="error-title">
                {error === "unregistered"
                  ? "このアカウントは\n登録されていません"
                  : "ログイン状態を保存できません"}
              </h2>
              <p className="login-description" role="alert">
                {error === "unregistered"
                  ? "会社のGoogleアカウントで再度お試しください。\n利用を希望する場合は管理者にお問い合わせください。"
                  : "ブラウザのストレージ設定をご確認ください。"}
              </p>
              <button
                className="google-button"
                onClick={() => {
                  setError("");
                  setPicker(true);
                }}
              >
                <GoogleMark />
                別のGoogleアカウントでログイン
              </button>
              <button className="back-button" onClick={() => setError("")}>
                <ArrowLeft size={15} />
                ログイン画面に戻る
              </button>
            </>
          ) : (
            <>
              <h2>ログイン</h2>
              <p className="login-description">
                会社のGoogleアカウントで
                <br />
                ログインしてください。
              </p>
              <button className="google-button" onClick={() => setPicker(true)}>
                <GoogleMark />
                Googleでログイン
              </button>
              <label className="remember">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                ログイン状態を保持する
              </label>
              <div className="login-help">
                ログインできない場合は
                <br />
                管理者にお問い合わせください。
              </div>
            </>
          )}
        </div>
        <span className="login-footer">
          社内メンバー専用 <span>· UIプレビュー</span>
        </span>
      </section>
      {picker && (
        <Modal title="プレビュー用アカウント" onClose={() => setPicker(false)}>
          <p className="muted">
            モック認証です。Googleへの接続や情報の送信は行いません。
          </p>
          <button className="account-choice" onClick={() => choose("member")}>
            <UserRound />
            <span>
              <strong>山田 太郎</strong>
              <small>登録済みメンバー · 営業部</small>
            </span>
          </button>
          <button
            className="account-choice"
            onClick={() => choose("unregistered")}
          >
            <AlertCircle />
            <span>
              <strong>未登録アカウント</strong>
              <small>エラー画面を確認</small>
            </span>
          </button>
        </Modal>
      )}
    </div>
  );
}
