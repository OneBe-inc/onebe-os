import { useEffect, useMemo, useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import {
  ArrowUpRight,
  BookOpen,
  Bookmark,
  History,
  List,
  Printer,
  Search,
} from "lucide-react";
import { Modal } from "../components";
import {
  articleText,
  articlesOf,
  categories,
  categoryName,
  dateLabel,
  normalize,
  regulations,
  searchRegulations,
} from "./data";
import type { Regulation } from "./data";
import "./policies.css";

export function policyPath(id: string, articleId?: string) {
  return `/internal/policies?rule=${encodeURIComponent(id)}${articleId ? `#article-${encodeURIComponent(articleId)}` : ""}`;
}

function Highlight({ text, query }: { text: string; query: string }) {
  const term = query.trim();
  if (!term) return <>{text}</>;
  const pattern = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return (
    <>
      {text
        .split(new RegExp(`(${pattern})`, "gi"))
        .map((part, i) => (i % 2 ? <mark key={i}>{part}</mark> : part))}
    </>
  );
}

export function Policies({ userId }: { userId: string }) {
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const requested = params.get("rule");
  const rule = regulations.find((r) => r.id === requested) ?? regulations[0];
  const view = params.get("view") ?? "read";
  const listView = view === "all" || view === "favorites";
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [within, setWithin] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [font, setFont] = useState(1);
  const [tocOpen, setTocOpen] = useState(
    () => window.matchMedia("(min-width: 1021px)").matches,
  );
  const [storageMessage, setStorageMessage] = useState("");
  const storageKey = `onebe:policies:favorites:v1:${userId}`;
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const value: unknown = JSON.parse(
        localStorage.getItem(storageKey) ?? "[]",
      );
      return Array.isArray(value)
        ? value.filter(
            (id): id is string =>
              typeof id === "string" && regulations.some((r) => r.id === id),
          )
        : [];
    } catch {
      return [];
    }
  });
  const articles = articlesOf(rule);
  const matching = useMemo(
    () =>
      normalize(within)
        ? articlesOf(rule).filter((a) =>
            normalize(articleText(a)).includes(normalize(within)),
          )
        : [],
    [rule, within],
  );
  const results = useMemo(() => searchRegulations(query), [query]);
  const visibleRules = regulations.filter(
    (r) =>
      (category === "all" || r.category === category) &&
      (view !== "favorites" || favorites.includes(r.id)),
  );

  useEffect(() => {
    setWithin("");
  }, [rule.id]);
  useEffect(() => {
    const media = window.matchMedia("(min-width: 1021px)");
    const resize = () => setTocOpen(media.matches);
    media.addEventListener("change", resize);
    return () => media.removeEventListener("change", resize);
  }, []);
  useEffect(() => {
    if (listView) {
      document.title = `${view === "favorites" ? "お気に入り" : "規定一覧"} · 社内規定 | OneBe OS`;
      window.scrollTo(0, 0);
      return;
    }
    document.title = `${rule.title} · 社内規定 | OneBe OS`;
    const frame = requestAnimationFrame(() => {
      if (location.hash) {
        const node = document.getElementById(location.hash.slice(1));
        node?.scrollIntoView({ block: "start" });
        node?.focus({ preventScroll: true });
      } else {
        window.scrollTo(0, 0);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [location.key, location.hash, rule.title, listView, view]);

  function toggleFavorite(id: string) {
    const next = favorites.includes(id)
      ? favorites.filter((x) => x !== id)
      : [...favorites, id];
    setFavorites(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
      setStorageMessage("");
    } catch {
      setStorageMessage(
        "お気に入りはこの画面でのみ反映されます。ブラウザに保存できませんでした。",
      );
    }
  }
  function openRule(id: string, articleId?: string) {
    navigate(policyPath(id, articleId));
    setSearchOpen(false);
    setQuery("");
  }
  function favoriteButton(r: Regulation) {
    return (
      <button
        className={`pol-icon ${favorites.includes(r.id) ? "is-saved" : ""}`}
        aria-label={`${r.title}をお気に入り${favorites.includes(r.id) ? "から削除" : "に追加"}`}
        aria-pressed={favorites.includes(r.id)}
        onClick={() => toggleFavorite(r.id)}
      >
        <Bookmark
          size={18}
          fill={favorites.includes(r.id) ? "currentColor" : "none"}
        />
      </button>
    );
  }

  return (
    <div className="policies">
      <div className="pol-page-heading">
        <div>
          <p className="pol-eyebrow">WORKPLACE GUIDE</p>
          <h1>社内規定</h1>
          <p className="pol-subtitle">いつもの仕事に、迷わないためのガイド。</p>
        </div>
        <button
          className="pol-search-launch"
          onClick={() => setSearchOpen(true)}
        >
          <Search size={18} />
          <span>すべての規定を検索</span>
        </button>
      </div>
      <div className="pol-sample">
        <span>サンプル</span>
        デザイン確認用の規定です。会社の正式な規定ではありません。
      </div>
      <nav className="pol-tabs" aria-label="社内規定の表示">
        <Link
          to={policyPath(rule.id)}
          aria-current={!listView ? "page" : undefined}
        >
          <BookOpen size={17} />
          規定を読む
        </Link>
        <Link
          to="/internal/policies?view=all"
          aria-current={view === "all" ? "page" : undefined}
        >
          <List size={17} />
          規定一覧<span>{regulations.length}</span>
        </Link>
        <Link
          to="/internal/policies?view=favorites"
          aria-current={view === "favorites" ? "page" : undefined}
        >
          <Bookmark size={17} />
          お気に入り<span>{favorites.length}</span>
        </Link>
      </nav>
      {storageMessage && (
        <p className="pol-status" role="status">
          {storageMessage}
        </p>
      )}
      {requested && !regulations.some((r) => r.id === requested) && (
        <p className="pol-status" role="status">
          指定された規定が見つからないため、就業規則を表示しています。
        </p>
      )}
      {listView ? (
        <section
          className="pol-catalog"
          aria-label={view === "favorites" ? "お気に入りの規定" : "規定一覧"}
        >
          <div className="pol-filter">
            <label htmlFor="pol-category">カテゴリー</label>
            <select
              id="pol-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="all">すべてのカテゴリー</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <span>{visibleRules.length}件</span>
          </div>
          <div className="pol-cards">
            {visibleRules.map((r) => (
              <article className="pol-card" key={r.id}>
                <div className="pol-card-top">
                  <span className="pol-category">
                    {categoryName(r.category)}
                  </span>
                  {favoriteButton(r)}
                </div>
                <Link className="pol-card-link" to={policyPath(r.id)}>
                  <h2>
                    {r.title}
                    <ArrowUpRight size={18} />
                  </h2>
                  <p>{r.summary}</p>
                </Link>
                <div className="pol-meta">
                  更新 {dateLabel(r.updatedAt)}
                  <span>全{articlesOf(r).length}条</span>
                </div>
              </article>
            ))}
          </div>
          {!visibleRules.length && (
            <div className="pol-empty">
              <Bookmark size={26} />
              <h2>該当する規定はありません</h2>
              <p>
                {view === "favorites"
                  ? "規定のしおりボタンから、お気に入りに追加できます。"
                  : "別のカテゴリーを選択してください。"}
              </p>
            </div>
          )}
        </section>
      ) : (
        <>
          <div className="pol-reader-top">
            <label htmlFor="pol-rule">閲覧中の規定</label>
            <select
              id="pol-rule"
              value={rule.id}
              onChange={(e) => openRule(e.target.value)}
            >
              {regulations.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title}
                </option>
              ))}
            </select>
            <span>全{articles.length}条</span>
          </div>
          <div className="pol-reading-layout">
            <article
              className={`pol-document pol-font-${font}`}
              aria-label={`${rule.title}の本文`}
            >
              <header className="pol-document-heading">
                <div className="pol-document-label">
                  <span>RULE {rule.number}</span>
                  <span className="pol-category">
                    {categoryName(rule.category)}
                  </span>
                  {favoriteButton(rule)}
                </div>
                <h2>{rule.title}</h2>
                <p>{rule.summary}</p>
                <div className="pol-meta">
                  <span>{rule.code}</span>
                  <span>更新 {dateLabel(rule.updatedAt)}</span>
                  <span>第{rule.version}版</span>
                </div>
              </header>
              <div className="pol-update">
                <History size={17} />
                <div>
                  <strong>{rule.revisions[0].title}</strong>
                  <p>{dateLabel(rule.revisions[0].date)} · 表示例</p>
                </div>
                <button onClick={() => setHistoryOpen(true)}>改定履歴</button>
              </div>
              <div className="pol-tools">
                <label className="pol-within">
                  <Search size={16} />
                  <input
                    type="search"
                    aria-label="この規定内を検索"
                    placeholder="この規定内を検索"
                    value={within}
                    onChange={(e) => setWithin(e.target.value)}
                  />
                </label>
                <div className="pol-tool-buttons">
                  <label>
                    文字サイズ
                    <select
                      aria-label="本文の文字サイズ"
                      value={font}
                      onChange={(e) => setFont(Number(e.target.value))}
                    >
                      <option value={0}>小</option>
                      <option value={1}>標準</option>
                      <option value={2}>大</option>
                    </select>
                  </label>
                  <button
                    className="pol-icon"
                    aria-label="この規定を印刷"
                    onClick={() => window.print()}
                  >
                    <Printer size={18} />
                  </button>
                </div>
              </div>
              {normalize(within) && (
                <div className="pol-within-results" role="status">
                  <span>該当する条文 {matching.length}件</span>
                  {matching.map((a) => (
                    <Link key={a.id} to={policyPath(rule.id, a.id)}>
                      第{a.number}条
                    </Link>
                  ))}
                </div>
              )}
              <div className="pol-provisions">
                {rule.chapters.map((chapter, i) => (
                  <section
                    key={chapter.id}
                    aria-labelledby={`chapter-${chapter.id}`}
                  >
                    <h3 id={`chapter-${chapter.id}`} tabIndex={-1}>
                      <span>第{i + 1}章</span>
                      {chapter.title}
                    </h3>
                    {chapter.articles.map((a) => (
                      <section
                        className="pol-article"
                        key={a.id}
                        id={`article-${a.id}`}
                        tabIndex={-1}
                      >
                        <h4>
                          <span>第{a.number}条</span>
                          <Highlight text={a.title} query={within} />
                        </h4>
                        {a.paragraphs.map((p, j) => (
                          <p key={j}>
                            <Highlight text={p} query={within} />
                          </p>
                        ))}
                        {a.items && (
                          <ol>
                            {a.items.map((item, j) => (
                              <li key={j}>
                                <Highlight text={item} query={within} />
                              </li>
                            ))}
                          </ol>
                        )}
                      </section>
                    ))}
                  </section>
                ))}
              </div>
              <footer className="pol-document-footer">
                <BookOpen size={16} />
                <span>以上、全{articles.length}条 · サンプル規定</span>
                <a href="#main">ページの先頭へ ↑</a>
              </footer>
            </article>
            <aside className="pol-toc" aria-label="この規定の目次">
              <details
                open={tocOpen}
                onToggle={(e) => setTocOpen(e.currentTarget.open)}
              >
                <summary>この規定の目次</summary>
              <nav aria-label="章・条文への移動">
                  {rule.chapters.map((chapter, i) => (
                    <div key={chapter.id}>
                      <Link
                        className="pol-toc-chapter"
                        to={`${policyPath(rule.id)}#chapter-${chapter.id}`}
                      >
                        第{i + 1}章　{chapter.title}
                      </Link>
                      {chapter.articles.map((a) => (
                        <Link
                          key={a.id}
                          to={policyPath(rule.id, a.id)}
                          aria-current={
                            location.hash === `#article-${a.id}`
                              ? "location"
                              : undefined
                          }
                        >
                          <span>第{a.number}条</span>
                          {a.title}
                        </Link>
                      ))}
                    </div>
                  ))}
                </nav>
              </details>
              <p>
                必要なルールを、
                <br />
                すぐに見つけられる場所。
              </p>
            </aside>
          </div>
        </>
      )}
      {searchOpen && (
        <Modal
          title="規定を横断検索"
          wide
          onClose={() => {
            setSearchOpen(false);
            setQuery("");
          }}
        >
          <div className="pol-search-dialog">
            <label className="pol-search-input">
              <Search size={20} />
              <input
                data-initial-focus
                type="search"
                aria-label="規定の検索キーワード"
                placeholder="規定名・キーワードから探す"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <p className="pol-search-count" role="status">
              {normalize(query)
                ? `${results.length}件の規定が見つかりました`
                : "本文も含めて検索できます。例：領収書、情報、勤務"}
            </p>
            <div className="pol-search-results">
              {results.map(({ rule: r, matches }) => (
                <section key={r.id}>
                  <button
                    className="pol-search-rule"
                    onClick={() => openRule(r.id)}
                  >
                    <BookOpen size={18} />
                    <strong>{r.title}</strong>
                    <span>{categoryName(r.category)}</span>
                  </button>
                  {matches.map((a) => (
                    <button
                      className="pol-search-match"
                      key={a.id}
                      onClick={() => openRule(r.id, a.id)}
                    >
                      <strong>
                        第{a.number}条　
                        <Highlight text={a.title} query={query} />
                      </strong>
                      <p>
                        <Highlight
                          text={[...a.paragraphs, ...(a.items ?? [])].join(" ")}
                          query={query}
                        />
                      </p>
                      <span>この条文を読む →</span>
                    </button>
                  ))}
                </section>
              ))}
            </div>
          </div>
        </Modal>
      )}
      {historyOpen && (
        <Modal
          title={`${rule.title}の改定履歴`}
          onClose={() => setHistoryOpen(false)}
        >
          <div className="pol-history">
            <p>以下はデザイン確認用の表示例です。</p>
            {rule.revisions.map((r) => (
              <article key={r.version}>
                <div className="pol-meta">
                  {dateLabel(r.date)} · 第{r.version}版
                </div>
                <h3>{r.title}</h3>
                <p>{r.description}</p>
              </article>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
