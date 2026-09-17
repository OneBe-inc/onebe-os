import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Navigate,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  Bell,
  Search,
  CircleHelp,
  ChevronDown,
  ChevronRight,
  Menu,
  LogOut,
  UserRound,
  Settings,
  ArrowRight,
  Construction,
  SearchX,
  Folder,
  CheckCheck,
  X,
} from "lucide-react";
import type { DashboardData, User } from "./domain";
import { auth, isMockAuth } from "./data/auth";
import { mockRepository } from "./data/mock";
import { navigation, pageTitle } from "./navigation";
import { Login } from "./Login";
import { Avatar, Brand, Modal } from "./components";
import { Dashboard, TaskList } from "./Dashboard";
import type { DetailView } from "./Dashboard";
import { safeReturnTo } from "./return-to";

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const revision = useRef(0);
  const navigate = useNavigate();
  const location = useLocation();
  const requested: unknown =
    location.state?.from ??
    new URLSearchParams(location.search).get("returnTo");
  const returnTo = safeReturnTo(requested);
  const sync = useCallback(async () => {
    const current = ++revision.current;
    try {
      const member = await auth.readSession();
      if (current !== revision.current) return;
      setUser(member);
      setAuthError("");
    } catch {
      if (current === revision.current)
        setAuthError(
          "ログイン状態を確認できませんでした。時間をおいて再度お試しください。",
        );
    } finally {
      if (current === revision.current) setAuthLoading(false);
    }
  }, []);
  useEffect(() => {
    void sync();
    window.addEventListener("storage", sync);
    window.addEventListener("focus", sync);
    window.addEventListener("onebe:session-expired", sync);
    const timer = window.setInterval(sync, 60000);
    return () => {
      clearInterval(timer);
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", sync);
      window.removeEventListener("onebe:session-expired", sync);
      revision.current++;
    };
  }, [sync]);
  const signIn = async (
    account: "member" | "unregistered",
    remember: boolean,
  ) => {
    const next = await auth.signIn(account, remember, returnTo);
    if (next) {
      revision.current++;
      setUser(next);
    }
  };
  const signOut = async () => {
    revision.current++;
    try {
      await auth.signOut();
      revision.current++;
      setUser(null);
      navigate("/login", { replace: true });
    } catch {
      setAuthError(
        "ログアウトできませんでした。接続を確認して再度お試しください。",
      );
    }
  };
  if (authLoading)
    return (
      <div className="loading-state" role="status">
        ログイン状態を確認しています…
      </div>
    );
  if (authError)
    return (
      <div className="empty-state">
        <Brand />
        <h1>接続を確認してください</h1>
        <p role="alert">{authError}</p>
        <button
          className="primary-button"
          onClick={() => {
            setAuthLoading(true);
            void sync();
          }}
        >
          再読み込み
        </button>
      </div>
    );
  return (
    <Routes>
      <Route
        path="/login"
        element={
          user ? <Navigate to={returnTo} replace /> : <Login signIn={signIn} />
        }
      />
      <Route
        path="/*"
        element={
          user ? (
            <Workspace key={user.id} user={user} signOut={signOut} />
          ) : (
            <Navigate to="/login" replace state={{ from: location.pathname }} />
          )
        }
      />
    </Routes>
  );
}
function Workspace({
  user,
  signOut,
}: {
  user: User;
  signOut: () => Promise<void>;
}) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [completed, setCompleted] = useState(() =>
    mockRepository.getCompletedTasks(user.id),
  );
  const [read, setRead] = useState(() =>
    mockRepository.getReadNotifications(user.id),
  );
  const [expanded, setExpanded] = useState<string[]>(["/sales"]);
  const [mobile, setMobile] = useState(false);
  const [search, setSearch] = useState(false);
  const [query, setQuery] = useState("");
  const [panel, setPanel] = useState<"notifications" | "user" | "help" | null>(
    null,
  );
  const [view, setView] = useState<DetailView>(null);
  const [message, setMessage] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const go = useCallback(
    (path: string) => {
      navigate(path);
      setPanel(null);
      setSearch(false);
      setView(null);
      setMobile(false);
    },
    [navigate],
  );
  useEffect(() => {
    const controller = new AbortController();
    setLoadError(false);
    mockRepository
      .getDashboard(controller.signal)
      .then(setData)
      .catch((e) => {
        if (e.name !== "AbortError") setLoadError(true);
      });
    return () => controller.abort();
  }, [retry]);
  useEffect(() => {
    const parent = navigation.find(
      (n) =>
        n.children.length &&
        (location.pathname === n.path ||
          location.pathname.startsWith(n.path + "/")),
    );
    if (parent)
      setExpanded((old) =>
        old.includes(parent.path) ? old : [...old, parent.path],
      );
    setMobile(false);
    setPanel(null);
    document.title = `${pageTitle(location.pathname)} | OneBe OS`;
  }, [location.pathname]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearch((s) => !s);
      }
      if (e.key === "Escape") {
        setPanel(null);
        setMobile(false);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  useEffect(() => {
    if (!message) return;
    const id = setTimeout(() => setMessage(""), 4000);
    return () => clearTimeout(id);
  }, [message]);
  const toggle = (id: string) => {
    const next = completed.includes(id)
      ? completed.filter((x) => x !== id)
      : [...completed, id];
    try {
      mockRepository.saveCompletedTasks(user.id, next);
      setCompleted(next);
    } catch {
      setMessage("保存できませんでした。ブラウザの設定をご確認ください。");
    }
  };
  const markRead = (ids: string[]) => {
    const next = [...new Set([...read, ...ids])];
    try {
      mockRepository.saveReadNotifications(user.id, next);
      setRead(next);
    } catch {
      setMessage("通知の状態を保存できませんでした。");
    }
  };
  const results = useMemo(() => {
    const pages = navigation.flatMap((n) =>
      n.children.length
        ? n.children.map(([title, path]) => ({ title, path, type: n.label }))
        : [{ title: n.label, path: n.path, type: "ページ" }],
    );
    const projects =
      data?.projects.map((p) => ({
        title: `${p.company} ${p.name}`,
        path: `/projects/${p.id}`,
        type: "案件",
      })) ?? [];
    const tasks =
      data?.tasks.map((t) => ({
        title: t.title,
        path: "/projects/tasks",
        type: "タスク",
      })) ?? [];
    const normalize = (s: string) => s.normalize("NFKC").toLocaleLowerCase();
    return [...pages, ...projects, ...tasks]
      .filter((r) =>
        normalize(r.title + r.type).includes(normalize(query.trim())),
      )
      .slice(0, 12);
  }, [data, query]);
  const unread = data?.notices.filter((n) => !read.includes(n.id)).length ?? 0;
  const notice = view?.startsWith("notice:")
    ? data?.notices.find((n) => n.id === view.slice(7))
    : null;
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        本文へ移動
      </a>
      {mobile && (
        <button
          className="sidebar-scrim"
          aria-label="メニューを閉じる"
          onClick={() => setMobile(false)}
        />
      )}
      <aside
        className={`sidebar ${mobile ? "is-open" : ""}`}
        aria-label="メインナビゲーション"
      >
        <div className="sidebar-brand">
          <NavLink to="/dashboard" aria-label="OneBe OS ホーム">
            <Brand light compact />
          </NavLink>
          <button
            className="icon-button mobile-close"
            aria-label="メニューを閉じる"
            onClick={() => setMobile(false)}
          >
            <X />
          </button>
        </div>
        <nav>
          {navigation.map((n) => {
            const isExpanded = expanded.includes(n.path);
            const active =
              location.pathname === n.path ||
              location.pathname.startsWith(n.path + "/");
            return (
              <div className="nav-group" key={n.path}>
                {n.children.length ? (
                  <button
                    className={`nav-parent ${active ? "active-parent" : ""}`}
                    aria-expanded={isExpanded}
                    aria-controls={`nav-${n.path.slice(1)}`}
                    onClick={() =>
                      setExpanded((prev) =>
                        isExpanded
                          ? prev.filter((x) => x !== n.path)
                          : [...prev, n.path],
                      )
                    }
                  >
                    <n.icon size={21} />
                    <span>{n.label}</span>
                    <ChevronDown
                      size={15}
                      className={isExpanded ? "rotated" : ""}
                    />
                  </button>
                ) : (
                  <NavLink className="nav-parent" to={n.path}>
                    <n.icon size={21} />
                    <span>{n.label}</span>
                  </NavLink>
                )}
                {n.children.length > 0 && (
                  <div
                    className="nav-children"
                    id={`nav-${n.path.slice(1)}`}
                    hidden={!isExpanded}
                  >
                    {n.children.map(([label, path]) => (
                      <NavLink
                        end
                        key={path}
                        to={path}
                        onClick={() => setMobile(false)}
                      >
                        <span className="nav-dot">•</span>
                        {label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="brand-note">
            <span>
              本気の想いを、
              <br />
              本気で伝える。
            </span>
            <small>OneBe Mission</small>
          </div>
          <Brand light compact />
          <small className="version">Ver.0.1.0</small>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <button
            className="icon-button menu-button"
            aria-label="メニューを開く"
            onClick={() => setMobile(true)}
          >
            <Menu />
          </button>
          <button className="global-search" onClick={() => setSearch(true)}>
            <Search size={19} />
            <span>企業・人物・案件・タスクなどを検索...</span>
            <kbd>⌘ K</kbd>
          </button>
          <div className="header-actions">
            <button
              className="icon-button notification-button"
              aria-label={`通知 ${unread}件の未読`}
              aria-expanded={panel === "notifications"}
              onClick={() =>
                setPanel(panel === "notifications" ? null : "notifications")
              }
            >
              <Bell size={24} />
              {unread > 0 && <b>{unread}</b>}
            </button>
            <button
              className="icon-button help-button"
              aria-label="ヘルプ"
              onClick={() => setPanel("help")}
            >
              <CircleHelp size={21} />
            </button>
            <button
              className="user-button"
              aria-expanded={panel === "user"}
              onClick={() => setPanel(panel === "user" ? null : "user")}
            >
              <Avatar
                key={user.avatarUrl ?? "initials"}
                name={user.name}
                imageUrl={user.avatarUrl}
              />
              <span>
                <strong>{user.name}</strong>
                <small>{user.department}</small>
              </span>
              <ChevronDown size={16} />
            </button>
          </div>
        </header>
        {panel && panel !== "help" && (
          <>
            <button
              className="popover-dismiss"
              aria-label="メニューを閉じる"
              onClick={() => setPanel(null)}
            />
            <div
              className={`popover ${panel}`}
              role="region"
              aria-label={panel === "user" ? "ユーザーメニュー" : "通知"}
            >
              {panel === "user" ? (
                <>
                  <div className="user-summary">
                    <strong>{user.name}</strong>
                    <span>
                      {user.department}
                      {isMockAuth ? " · プレビュー用メンバー" : ""}
                    </span>
                  </div>
                  <button onClick={() => go("/settings/profile")}>
                    <UserRound size={17} />
                    プロフィール
                  </button>
                  <button onClick={() => go("/settings/notifications")}>
                    <Settings size={17} />
                    通知設定
                  </button>
                  <button className="logout" onClick={signOut}>
                    <LogOut size={17} />
                    ログアウト
                  </button>
                </>
              ) : (
                <>
                  <div className="popover-heading">
                    <h2>
                      通知 <span>{unread}</span>
                    </h2>
                    <button
                      className="text-button"
                      onClick={() =>
                        markRead(data?.notices.map((n) => n.id) ?? [])
                      }
                    >
                      <CheckCheck size={14} />
                      すべて既読
                    </button>
                  </div>
                  {data?.notices.map((n) => (
                    <button
                      className={`notification-item ${!read.includes(n.id) ? "unread" : ""}`}
                      key={n.id}
                      onClick={() => {
                        markRead([n.id]);
                        setPanel(null);
                        setView(`notice:${n.id}`);
                      }}
                    >
                      <span className="unread-dot" />
                      <span>
                        <strong>{n.title}</strong>
                        <small>
                          {n.date} · {n.category}
                        </small>
                      </span>
                    </button>
                  ))}
                </>
              )}
            </div>
          </>
        )}
        <main id="main" tabIndex={-1}>
          {loadError ? (
            <div className="empty-state">
              <h1>データを読み込めませんでした</h1>
              <button
                className="primary-button"
                onClick={() => setRetry((x) => x + 1)}
              >
                再読み込み
              </button>
            </div>
          ) : !data ? (
            <div className="loading-state" role="status">
              ワークスペースを読み込んでいます…
            </div>
          ) : (
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route
                path="/dashboard"
                element={
                  <Dashboard
                    userName={user.name}
                    data={data}
                    completed={completed}
                    toggle={toggle}
                    open={setView}
                    navigate={go}
                  />
                }
              />
              <Route
                path="*"
                element={
                  <Placeholder
                    data={data}
                    path={location.pathname}
                    navigate={go}
                  />
                }
              />
            </Routes>
          )}
        </main>
      </div>
      {search && (
        <Modal
          title="全体検索"
          wide
          onClose={() => {
            setSearch(false);
            setQuery("");
          }}
        >
          <div className="search-input">
            <Search size={20} />
            <input
              data-initial-focus
              aria-label="検索キーワード"
              placeholder="企業・人物・案件・タスクを検索"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && results[0]) go(results[0].path);
              }}
            />
            <kbd>Esc</kbd>
          </div>
          <p className="search-caption">
            {query ? `${results.length}件の結果` : "ページ・案件へすばやく移動"}
          </p>
          <div className="search-results">
            {results.map((r, i) => (
              <button key={`${r.path}-${i}`} onClick={() => go(r.path)}>
                <Folder size={18} />
                <span>
                  <strong>{r.title}</strong>
                  <small>{r.type}</small>
                </span>
                <ArrowRight size={16} />
              </button>
            ))}
            {!results.length && (
              <div className="empty-search">
                <SearchX />
                <p>「{query}」に一致する結果はありません</p>
                <small>別のキーワードでお試しください。</small>
              </div>
            )}
          </div>
        </Modal>
      )}
      {panel === "help" && (
        <Modal title="OneBe OSについて" onClose={() => setPanel(null)}>
          <p>
            Phase
            1ではログイン、共通ナビゲーション、ダッシュボードの操作を確認できます。
          </p>
          <p>
            業務データはサンプルです。Calendar・freeeなどの業務連携はまだ接続されていません。
            {isMockAuth
              ? "現在はモック認証のUIプレビューです。"
              : "ログイン状態はCloudflare側で管理されています。"}
          </p>
          <p className="muted">検索：Ctrl / ⌘ + K　閉じる：Esc</p>
        </Modal>
      )}
      {view && data && (
        <Modal
          title={
            notice?.title ??
            {
              actions: "要対応",
              tasks: "今日のタスク",
              events: "本日の予定",
              approvals: "承認待ち",
              renewals: "契約更新",
            }[view as string] ??
            "詳細"
          }
          wide
          onClose={() => setView(null)}
        >
          {view === "tasks" && (
            <TaskList
              tasks={data.tasks}
              completed={completed}
              toggle={toggle}
            />
          )}{" "}
          {view === "actions" && (
            <div className="detail-list">
              {data.actions.map((a) => (
                <button key={a.id} onClick={() => go(a.path)}>
                  <span>
                    <strong>{a.title}</strong>
                    <small>{a.detail}</small>
                  </span>
                  <ChevronRight size={17} />
                </button>
              ))}
            </div>
          )}
          {view === "events" && (
            <>
              <p className="muted">
                Google
                Calendarの予定を表示する領域です。現在はサンプル予定です。
              </p>
              <div className="detail-list">
                {data.events.map((e) => (
                  <div key={e.id}>
                    <time>{e.time}</time>
                    <strong>{e.title}</strong>
                    <small>{e.location}</small>
                  </div>
                ))}
              </div>
            </>
          )}
          {view === "approvals" && (
            <div className="detail-list">
              {data.approvals.map((a) => (
                <button key={a.id} onClick={() => go(`/approvals/${a.id}`)}>
                  <span>
                    <strong>{a.title}</strong>
                    <small>
                      {a.requester} / {a.date}
                    </small>
                  </span>
                  <b>{a.amount.toLocaleString()}円</b>
                  <ChevronRight size={17} />
                </button>
              ))}
            </div>
          )}
          {view === "renewals" && (
            <div className="detail-list">
              {data.renewals.map((c) => (
                <button key={c.id} onClick={() => go("/finance/contracts")}>
                  <span>
                    <strong>{c.title}</strong>
                    <small>担当：{c.owner}</small>
                  </span>
                  <b>あと{c.days}日</b>
                  <ChevronRight size={17} />
                </button>
              ))}
            </div>
          )}
          {notice && (
            <article className="notice-detail">
              <p className="muted">
                {notice.date} · {notice.category}
              </p>
              <p>{notice.body}</p>
            </article>
          )}
        </Modal>
      )}
      {message && (
        <div className="toast" role="status">
          {message}
        </div>
      )}
    </div>
  );
}
function Placeholder({
  data,
  path,
  navigate,
}: {
  data: DashboardData;
  path: string;
  navigate: (p: string) => void;
}) {
  const project = data.projects.find((p) => path === `/projects/${p.id}`);
  const approval = data.approvals.find((a) => path === `/approvals/${a.id}`);
  const known =
    navigation.some(
      (n) => n.path === path || n.children.some(([, p]) => p === path),
    ) ||
    ["/settings/profile", "/settings/notifications"].includes(path) ||
    project ||
    approval;
  const title = project
    ? project.name
    : approval
      ? approval.title
      : path === "/settings/profile"
        ? "プロフィール"
        : path === "/settings/notifications"
          ? "通知設定"
          : pageTitle(path);
  return (
    <>
      <div className="page-breadcrumb">
        <button onClick={() => navigate("/dashboard")}>ホーム</button>
        <ChevronRight size={14} />
        {title}
      </div>
      <div className="empty-state">
        <div className="empty-icon">
          <Construction size={28} />
        </div>
        <span className="eyebrow">ONEBE OS</span>
        <h1>{title}</h1>
        <p>
          {known
            ? "このページは準備中です。"
            : "お探しのページは見つかりませんでした。"}
        </p>
        {project && (
          <p>
            {project.company} · 進捗 {project.progress}% · 納期 {project.due}
          </p>
        )}
        <small>
          {known
            ? "共通レイアウトとページへの導線を先行して公開しています。"
            : "URLをご確認いただくか、ホームへお戻りください。"}
        </small>
        <button
          className="primary-button"
          onClick={() => navigate("/dashboard")}
        >
          ホームに戻る
          <ArrowRight size={16} />
        </button>
      </div>
    </>
  );
}
