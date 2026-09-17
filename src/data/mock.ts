import type { DashboardData, WorkspaceRepository } from "../domain";
export const mockUser = {
  id: "demo-yamada",
  name: "山田 太郎",
  department: "営業部",
  initials: "山田",
};
const tasks = [
  {
    id: "t1",
    title: "提案資料の作成（株式会社ABC）",
    time: "10:00",
    overdue: true,
  },
  { id: "t2", title: "見積内容の社内確認", time: "11:00" },
  { id: "t3", title: "クライアントMTG準備", time: "13:00" },
  { id: "t4", title: "月次レポートの作成", time: "16:00" },
  { id: "t5", title: "採用サイトのワイヤーフレーム確認", time: "17:00" },
  { id: "t6", title: "商談の議事録を共有", time: "17:15" },
  { id: "t7", title: "来週の提案日程を調整", time: "17:30" },
  { id: "t8", title: "制作チームへ素材を共有", time: "18:00" },
];
export const mockDashboard: DashboardData = {
  tasks,
  projects: [
    {
      id: "abc",
      company: "株式会社ABC",
      name: "コーポレートサイトリニューアル",
      status: "進行中",
      progress: 70,
      due: "2026/10/31",
      members: ["佐藤", "鈴木", "+2"],
    },
    {
      id: "xyz",
      company: "株式会社XYZ",
      name: "ECサイト構築",
      status: "進行中",
      progress: 40,
      due: "2026/11/30",
      members: ["高橋", "田中", "+1"],
    },
    {
      id: "def",
      company: "DEF株式会社",
      name: "ブランド戦略支援",
      status: "要確認",
      progress: 20,
      due: "2026/09/30",
      members: ["山田", "佐藤", "鈴木"],
    },
    {
      id: "ghi",
      company: "GHI株式会社",
      name: "採用サイト制作",
      status: "計画中",
      progress: 10,
      due: "2026/12/15",
      members: ["高橋", "田中", "+3"],
    },
  ],
  events: [
    {
      id: "e1",
      time: "10:00 - 11:00",
      title: "株式会社ABC 定例ミーティング",
      location: "オンライン",
      color: "blue",
    },
    {
      id: "e2",
      time: "13:00 - 14:00",
      title: "提案内容のすり合わせ（株式会社XYZ）",
      location: "会議室A",
      color: "orange",
    },
    {
      id: "e3",
      time: "15:00 - 16:00",
      title: "社内プロジェクト会議",
      location: "会議室B",
      color: "green",
    },
    {
      id: "e4",
      time: "17:00 - 18:00",
      title: "営業部 週次ミーティング",
      location: "オンライン",
      color: "blue",
    },
    {
      id: "e5",
      time: "18:00 - 18:15",
      title: "明日の予定確認",
      location: "オンライン",
      color: "green",
    },
  ],
  approvals: [
    {
      id: "a1",
      title: "購入申請：デザインツール",
      requester: "佐藤 花子",
      date: "2026/09/14",
      amount: 48000,
    },
    {
      id: "a2",
      title: "契約書：株式会社サンプル",
      requester: "鈴木 一郎",
      date: "2026/09/12",
      amount: 1200000,
    },
    {
      id: "a3",
      title: "見積承認：株式会社XYZ",
      requester: "高橋 健",
      date: "2026/09/11",
      amount: 850000,
    },
  ],
  notices: [
    {
      id: "n1",
      date: "2026/09/15",
      category: "全社",
      title: "10月の全社ミーティングについて",
      body: "10月の全社ミーティングは10月2日（金）10:00より開催予定です。各チームの進捗と今月の取り組みを共有します。",
    },
    {
      id: "n2",
      date: "2026/09/12",
      category: "営業部",
      title: "営業マニュアルを更新しました",
      body: "初回ヒアリングのチェックリストと提案資料の確認項目を更新しました。次回の商談準備の際にご確認ください。",
    },
    {
      id: "n3",
      date: "2026/09/10",
      category: "システム",
      title: "システムメンテナンスのお知らせ",
      body: "9/20 22:00 - 24:00にメンテナンスを予定しています。作業中の内容は事前に保存してください。",
    },
  ],
  actions: Array.from({ length: 12 }, (_, i) => ({
    id: `action-${i}`,
    title: [
      "見積の承認依頼",
      "制作物の確認",
      "入金予定の確認",
      "契約更新の確認",
    ][i % 4],
    detail: ["株式会社ABC", "株式会社XYZ", "DEF株式会社"][i % 3],
    path: [
      "/approvals",
      "/projects",
      "/finance/invoices",
      "/finance/contracts",
    ][i % 4],
  })),
  renewals: [
    { id: "c1", title: "ABC社 Web保守契約", days: 12, owner: "佐藤 花子" },
    { id: "c2", title: "XYZ社 運用支援契約", days: 30, owner: "山田 太郎" },
  ],
  revenue: {
    sales: 12500,
    receipts: 9800,
    target: 20000,
    months: [
      { month: "4月", sales: 1600, receipts: 1200 },
      { month: "5月", sales: 1900, receipts: 1400 },
      { month: "6月", sales: 2200, receipts: 1800 },
      { month: "7月", sales: 1900, receipts: 1700 },
      { month: "8月", sales: 2400, receipts: 1700 },
      { month: "9月", sales: 2500, receipts: 2000 },
    ],
  },
};
const read = (key: string): string[] => {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(value)
      ? value.filter((v): v is string => typeof v === "string")
      : [];
  } catch {
    return [];
  }
};
export const mockRepository: WorkspaceRepository = {
  async getDashboard(signal) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    return structuredClone(mockDashboard);
  },
  getCompletedTasks: (id) => read(`onebe:tasks:${id}`),
  saveCompletedTasks: (id, ids) =>
    localStorage.setItem(`onebe:tasks:${id}`, JSON.stringify(ids)),
  getReadNotifications: (id) => read(`onebe:read:${id}`),
  saveReadNotifications: (id, ids) =>
    localStorage.setItem(`onebe:read:${id}`, JSON.stringify(ids)),
};
