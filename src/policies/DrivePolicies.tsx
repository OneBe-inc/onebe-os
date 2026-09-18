import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, FileText, RefreshCw, Search } from "lucide-react";
import "./drive-policies.css";

type File = {
  id: string;
  name: string;
  modifiedTime: string | null;
  format: "document" | "pdf" | "unsupported";
};
type Listing = { files: File[]; fetchedAt: string };
const errors: Record<string, string> = {
  not_configured:
    "Google Driveとの接続設定を準備中です。接続後、承認済みの規定がここに表示されます。",
  auth_not_configured: "規定を閲覧するための認証設定を準備中です。",
  sign_in_required:
    "閲覧にはサインインが必要です。OneBeOSを開き直してください。",
  drive_permission_denied:
    "規定フォルダの読み取り権限を確認できません。管理者に確認してください。",
  not_found:
    "規定が見つからないか、表示対象から外れています。一覧を更新してください。",
  folder_unavailable:
    "規定フォルダを確認できません。管理者に確認してください。",
  rate_limited:
    "現在アクセスが集中しています。少し待ってから再読み込みしてください。",
  file_too_large:
    "この規定は表示できるサイズを超えています。管理者に確認してください。",
  unsupported_format:
    "この形式は本文表示に対応していません。GoogleドキュメントまたはPDFをご利用ください。",
  document_changed:
    "読み込み中に規定が更新されました。再読み込みしてください。",
};
async function readResponse(response: Response) {
  if (!response.headers.get("content-type")?.includes("application/json"))
    throw new Error("connection_failed");
  const value = await response.json();
  if (!response.ok) throw new Error(value.code ?? "connection_failed");
  return value;
}
function ErrorNotice({ code, retry }: { code: string; retry: () => void }) {
  return (
    <div className="drive-notice" role="status">
      <h2>
        {code === "not_configured"
          ? "Google Drive 未接続"
          : "規定を読み込めませんでした"}
      </h2>
      <p>
        {errors[code] ??
          "読み取りに失敗しました。時間をおいて再読み込みしてください。"}
      </p>
      <button className="pol-search-launch" onClick={retry}>
        <RefreshCw size={16} />
        再読み込み
      </button>
    </div>
  );
}

export function DrivePolicies() {
  const [params, setParams] = useSearchParams();
  const selected = params.get("file");
  const [listing, setListing] = useState<Listing | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [query, setQuery] = useState("");
  useEffect(() => {
    document.title = "Driveの規定 · 社内規定 | OneBe OS";
    const controller = new AbortController();
    setListing(null);
    setError("");
    fetch("/api/policies", {
      signal: controller.signal,
      credentials: "same-origin",
      cache: "no-store",
    })
      .then(readResponse)
      .then(setListing)
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, [retry]);
  const file = listing?.files.find((f) => f.id === selected);
  const visible =
    listing?.files.filter((f) =>
      f.name
        .normalize("NFKC")
        .toLowerCase()
        .includes(query.normalize("NFKC").trim().toLowerCase()),
    ) ?? [];
  return (
    <div className="policies drive-policies">
      <div className="pol-page-heading">
        <div>
          <p className="pol-eyebrow">GOOGLE DRIVE</p>
          <h1>社内規定</h1>
          <p className="pol-subtitle">承認済みの原本を、いつでも確認。</p>
        </div>
        <Link className="pol-search-launch" to="/internal/policies">
          <ArrowLeft size={16} />
          サンプル規定を見る
        </Link>
      </div>
      <div className="drive-heading">
        <h2>Driveの規定</h2>
        <button
          className="pol-search-launch"
          onClick={() => setRetry((n) => n + 1)}
        >
          <RefreshCw size={16} />
          一覧を更新
        </button>
      </div>
      <p className="drive-help">「承認済み」フォルダの規定だけを表示します。</p>
      {error ? (
        <ErrorNotice code={error} retry={() => setRetry((n) => n + 1)} />
      ) : !listing ? (
        <p className="drive-loading" role="status">
          承認済みの規定を読み込んでいます…
        </p>
      ) : selected ? (
        <>
          <button
            className="drive-back"
            onClick={() => setParams({ view: "drive" })}
          >
            ← 規定一覧に戻る
          </button>
          {file ? (
            <DriveDocument key={`${file.id}-${retry}`} file={file} />
          ) : (
            <ErrorNotice
              code="not_found"
              retry={() => setRetry((n) => n + 1)}
            />
          )}
        </>
      ) : (
        <>
          <label className="drive-filter">
            <Search size={18} />
            <input
              type="search"
              aria-label="Driveの規定名を検索"
              placeholder="規定名で検索"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          {!listing.files.length ? (
            <div className="drive-notice">
              <h2>承認済みの規定はまだありません</h2>
              <p>
                承認済みフォルダに原本を追加すると、一覧を更新して確認できます。
              </p>
            </div>
          ) : !visible.length ? (
            <p className="drive-loading" role="status">
              検索条件に一致する規定はありません。
            </p>
          ) : (
            <div className="pol-cards">
              {visible.map((f) => (
                <article className="pol-card" key={f.id}>
                  <span className="pol-category">
                    {f.format === "document"
                      ? "Googleドキュメント"
                      : f.format === "pdf"
                        ? "PDF"
                        : "本文表示未対応"}
                  </span>
                  <button
                    className="drive-file"
                    onClick={() => setParams({ view: "drive", file: f.id })}
                  >
                    <FileText size={20} />
                    <h3>{f.name}</h3>
                  </button>
                  <p className="pol-meta">
                    更新{" "}
                    {f.modifiedTime
                      ? new Date(f.modifiedTime).toLocaleString("ja-JP")
                      : "日時未取得"}
                  </p>
                </article>
              ))}
            </div>
          )}
          <p className="drive-fetched">
            取得日時：{new Date(listing.fetchedAt).toLocaleString("ja-JP")}
          </p>
        </>
      )}
    </div>
  );
}

function DriveDocument({ file }: { file: File }) {
  const [text, setText] = useState<string | null>(null);
  const [pdf, setPdf] = useState("");
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let objectUrl = "";
    setText(null);
    setPdf("");
    setError("");
    async function read() {
      if (file.format === "unsupported") throw new Error("unsupported_format");
      const response = await fetch(
        `/api/policies/${encodeURIComponent(file.id)}/content`,
        {
          credentials: "same-origin",
          cache: "no-store",
          signal: controller.signal,
        },
      );
      if (
        file.format === "pdf" &&
        response.ok &&
        response.headers.get("content-type")?.includes("application/pdf")
      ) {
        const blob = await response.blob();
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setPdf(objectUrl);
      } else {
        const result = await readResponse(response);
        if (typeof result.text !== "string")
          throw new Error("connection_failed");
        if (!controller.signal.aborted) setText(result.text);
      }
    }
    read().catch((e) => {
      if (!controller.signal.aborted) setError(e.message);
    });
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [file.id, file.format, retry]);
  return (
    <article className="drive-document" aria-label={`${file.name}の原本`}>
      <header>
        <h2>{file.name}</h2>
        <p>Google Driveの原本から読み取った内容です。</p>
      </header>
      {error ? (
        <ErrorNotice code={error} retry={() => setRetry((n) => n + 1)} />
      ) : pdf ? (
        <>
          <a
            className="drive-back"
            href={pdf}
            target="_blank"
            rel="noopener noreferrer"
          >
            PDFを別画面で開く ↗
          </a>
          <iframe className="drive-pdf" title={`${file.name}のPDF`} src={pdf} />
        </>
      ) : text !== null ? (
        <div className="drive-text">{text || "本文が空の文書です。"}</div>
      ) : (
        <p className="drive-loading" role="status">
          本文を読み込んでいます…
        </p>
      )}
    </article>
  );
}
