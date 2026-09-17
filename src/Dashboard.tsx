import {
  Bell,
  CheckSquare,
  CalendarDays,
  FileText,
  ArrowRight,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { Avatar, Card } from "./components";
import type { DashboardData, Task } from "./domain";
export type DetailView =
  | "actions"
  | "tasks"
  | "events"
  | "approvals"
  | "renewals"
  | `notice:${string}`
  | null;
export function TaskList({
  tasks,
  completed,
  toggle,
}: {
  tasks: Task[];
  completed: string[];
  toggle: (id: string) => void;
}) {
  return (
    <ul className="task-list">
      {tasks.map((t) => (
        <li key={t.id} className={completed.includes(t.id) ? "completed" : ""}>
          <label>
            <input
              type="checkbox"
              checked={completed.includes(t.id)}
              onChange={() => toggle(t.id)}
            />
            <span>{t.title}</span>
          </label>
          <time
            className={t.overdue && !completed.includes(t.id) ? "overdue" : ""}
          >
            {t.time}
          </time>
        </li>
      ))}
    </ul>
  );
}
export function Dashboard({
  data,
  completed,
  toggle,
  open,
  navigate,
  userName,
}: {
  data: DashboardData;
  completed: string[];
  toggle: (id: string) => void;
  open: (view: DetailView) => void;
  navigate: (path: string) => void;
  userName: string;
}) {
  const pending = data.tasks.filter((t) => !completed.includes(t.id));
  const overdue = pending.filter((t) => t.overdue).length;
  const date = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(new Date());
  const stats = [
    {
      label: "要対応",
      value: data.actions.length,
      note: "対応が必要な項目です",
      color: "red",
      icon: Bell,
      view: "actions",
    },
    {
      label: "今日のタスク",
      value: pending.length,
      note: overdue ? (
        <>
          うち期限切れ <em>{overdue}件</em>
        </>
      ) : (
        "期限切れのタスクはありません"
      ),
      color: "blue",
      icon: CheckSquare,
      view: "tasks",
    },
    {
      label: "本日の予定",
      value: data.events.length,
      note: "Google Calendar 予定",
      color: "green",
      icon: CalendarDays,
      view: "events",
    },
    {
      label: "承認待ち",
      value: data.approvals.length,
      note: "対応をお願いします",
      color: "orange",
      icon: FileText,
      view: "approvals",
    },
  ] as const;
  return (
    <>
      <div className="dashboard-welcome">
        <div>
          <h1>おはようございます、{userName.split(/[\s　]+/)[0]}さん</h1>
          <p>やるべきことを整理して、今日も一歩前へ。</p>
        </div>
        <div className="today">
          <time>{date}</time>
          <p>今日も、よい一日を。</p>
        </div>
      </div>
      <div className="stats-grid">
        {stats.map((s) => (
          <button
            className="stat-card"
            key={s.label}
            onClick={() => open(s.view)}
          >
            <span className={`stat-icon ${s.color}`}>
              <s.icon size={26} />
            </span>
            <span className="stat-body">
              <span className="stat-label">{s.label}</span>
              <strong>
                {s.value}
                <small>件</small>
              </strong>
              <span className="stat-note">{s.note}</span>
            </span>
            <ChevronRight size={18} />
          </button>
        ))}
      </div>
      <div className="main-grid">
        <Card
          title="進行案件"
          action={() => navigate("/projects")}
          className="projects-card"
        >
          <div className="project-list">
            {data.projects.map((p) => (
              <button
                className="project-row"
                key={p.id}
                onClick={() => navigate(`/projects/${p.id}`)}
              >
                <span
                  className={`project-accent ${p.status === "計画中" ? "planned" : ""}`}
                />
                <span className="project-name">
                  <strong>{p.company}</strong>
                  <span>{p.name}</span>
                </span>
                <span
                  className={`status ${p.status === "要確認" ? "warning" : p.status === "計画中" ? "neutral" : ""}`}
                >
                  {p.status}
                </span>
                <span className="project-progress">
                  <span className="progress-track">
                    <span style={{ width: `${p.progress}%` }} />
                  </span>
                  <span>{p.progress}%</span>
                </span>
                <time>{p.due}</time>
                <span className="avatar-group">
                  {p.members.map((m, i) => (
                    <Avatar name={m} small key={i} />
                  ))}
                </span>
              </button>
            ))}
          </div>
        </Card>
        <Card title="売上・入金概要" className="finance-card">
          <span className="fiscal-period">今期（2026/4 - 2027/3）</span>
          <div className="finance-totals">
            <div>
              <span>売上</span>
              <strong>
                {data.revenue.sales.toLocaleString()}
                <small> 万円</small>
              </strong>
              <span>
                （達成率{" "}
                {Math.floor((data.revenue.sales / data.revenue.target) * 100)}
                %）
              </span>
            </div>
            <div>
              <span>入金</span>
              <strong>
                {data.revenue.receipts.toLocaleString()}
                <small> 万円</small>
              </strong>
              <span>
                （回収率{" "}
                {Math.floor((data.revenue.receipts / data.revenue.sales) * 100)}
                %）
              </span>
            </div>
          </div>
          <RevenueChart revenue={data.revenue} />
        </Card>
      </div>
      <div className="bottom-grid">
        <Card
          title="今日のタスク"
          icon={
            <span className="mini-icon green">
              <CheckSquare size={17} />
            </span>
          }
          action={() => open("tasks")}
        >
          <TaskList
            tasks={data.tasks.slice(0, 5)}
            completed={completed}
            toggle={toggle}
          />
        </Card>
        <Card
          title="本日の予定"
          icon={
            <span className="mini-icon blue">
              <CalendarDays size={17} />
            </span>
          }
          action={() => open("events")}
        >
          <div className="event-list">
            {data.events.slice(0, 4).map((e) => (
              <button
                key={e.id}
                className={`event-row ${e.color}`}
                onClick={() => open("events")}
              >
                <time>{e.time}</time>
                <span>{e.title}</span>
                {e.id === "e1" && <span>（{e.location}）</span>}
              </button>
            ))}
          </div>
        </Card>
        <Card
          title="承認待ち"
          icon={
            <span className="mini-icon orange">
              <FileText size={17} />
            </span>
          }
          action={() => open("approvals")}
        >
          <ul className="approval-list">
            {data.approvals.map((a) => (
              <li key={a.id}>
                <button onClick={() => navigate(`/approvals/${a.id}`)}>
                  <strong>{a.title}</strong>
                  <span>
                    {a.requester} / {a.date}
                  </span>
                  <b>{a.amount.toLocaleString()}円</b>
                </button>
              </li>
            ))}
          </ul>
        </Card>
        <Card
          title="お知らせ"
          icon={
            <span className="mini-icon blue">
              <CalendarDays size={17} />
            </span>
          }
          action={() => navigate("/internal/notices")}
        >
          <ul className="notice-list">
            {data.notices.map((n) => (
              <li key={n.id}>
                <button onClick={() => open(`notice:${n.id}`)}>
                  <span>
                    <time>{n.date}</time>
                    <small>{n.category}</small>
                  </span>
                  <span>{n.title}</span>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <Card
        title="契約更新"
        className="renewal-card"
        icon={<RefreshCw size={18} />}
        action={() => open("renewals")}
      >
        <div className="renewal-list">
          {data.renewals.map((c) => (
            <button key={c.id} onClick={() => navigate("/finance/contracts")}>
              <span>
                {c.title}
                <small>担当：{c.owner}</small>
              </span>
              <span className={c.days <= 14 ? "warning-text" : ""}>
                更新まで {c.days}日
              </span>
              <ArrowRight size={16} />
            </button>
          ))}
        </div>
      </Card>
      <footer className="workspace-footer">
        OneBe OS <span>Phase 1 · サンプルデータ</span>
      </footer>
    </>
  );
}
function RevenueChart({ revenue }: { revenue: DashboardData["revenue"] }) {
  return (
    <figure className="revenue-chart" aria-label="月別売上と入金、単位は万円">
      <span className="chart-unit">（万円）</span>
      <div className="chart-plot">
        <div className="chart-axis">
          {[3000, 2000, 1000, 0].map((n) => (
            <span key={n}>{n.toLocaleString()}</span>
          ))}
        </div>
        <div className="chart-bars">
          {revenue.months.map((m) => (
            <div className="chart-month" key={m.month}>
              <div
                className="bar-pair"
                title={`${m.month} 売上 ${m.sales}万円 / 入金 ${m.receipts}万円`}
              >
                <span
                  className="bar sales"
                  style={{ height: `${(m.sales / 3000) * 100}%` }}
                />
                <span
                  className="bar receipts"
                  style={{ height: `${(m.receipts / 3000) * 100}%` }}
                />
              </div>
              <span>{m.month}</span>
            </div>
          ))}
        </div>
      </div>
      <figcaption>
        <span>
          <i className="sales" />
          売上
        </span>
        <span>
          <i className="receipts" />
          入金
        </span>
      </figcaption>
      <table className="sr-only">
        <caption>月別売上・入金（万円）</caption>
        <thead>
          <tr>
            <th>月</th>
            <th>売上</th>
            <th>入金</th>
          </tr>
        </thead>
        <tbody>
          {revenue.months.map((m) => (
            <tr key={m.month}>
              <th>{m.month}</th>
              <td>{m.sales}</td>
              <td>{m.receipts}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
