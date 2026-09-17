import {
  Home,
  Users,
  Folder,
  ChartColumn,
  FileCheck2,
  Settings,
  Building2,
} from "lucide-react";
export const navigation = [
  { label: "ホーム", path: "/dashboard", icon: Home, children: [] },
  {
    label: "営業",
    path: "/sales",
    icon: Users,
    children: [
      ["営業トップ", "/sales"],
      ["問い合わせ", "/sales/inquiries"],
      ["商談", "/sales/deals"],
      ["顧客", "/sales/customers"],
      ["人物・名刺", "/sales/contacts"],
    ],
  },
  {
    label: "案件",
    path: "/projects",
    icon: Folder,
    children: [
      ["案件一覧", "/projects"],
      ["新規作成", "/projects/new"],
      ["制作物", "/projects/deliverables"],
      ["タスク", "/projects/tasks"],
      ["ガントチャート", "/projects/gantt"],
      ["工数", "/projects/time"],
    ],
  },
  {
    label: "売上・経理",
    path: "/finance",
    icon: ChartColumn,
    children: [
      ["ダッシュボード", "/finance"],
      ["見積", "/finance/estimates"],
      ["契約", "/finance/contracts"],
      ["請求・入金", "/finance/invoices"],
      ["経費", "/finance/expenses"],
      ["レポート", "/finance/reports"],
    ],
  },
  {
    label: "承認",
    path: "/approvals",
    icon: FileCheck2,
    children: [
      ["承認センター", "/approvals"],
      ["自分の申請", "/approvals/mine"],
      ["申請する", "/approvals/new"],
    ],
  },
  {
    label: "社内",
    path: "/internal",
    icon: Building2,
    children: [
      ["メンバー・組織図", "/internal"],
      ["社内規定", "/internal/policies"],
      ["ナレッジ", "/internal/knowledge"],
      ["お知らせ", "/internal/notices"],
    ],
  },
  {
    label: "設定",
    path: "/settings",
    icon: Settings,
    children: [
      ["メンバー・権限", "/settings"],
      ["承認ルール", "/settings/approvals"],
      ["マスタ", "/settings/masters"],
      ["外部連携", "/settings/integrations"],
      ["操作履歴", "/settings/audit"],
    ],
  },
];
export function pageTitle(path: string) {
  if (path === "/dashboard") return "ホーム";
  for (const group of navigation) {
    const child = group.children.find(([, p]) => p === path);
    if (child) return child[0];
    if (group.path === path) return group.label;
  }
  return "ページが見つかりません";
}
