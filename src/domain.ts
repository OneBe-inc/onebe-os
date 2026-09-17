export interface User {
  id: string;
  name: string;
  department: string;
  initials: string;
}
export interface Task {
  id: string;
  title: string;
  time: string;
  overdue?: boolean;
}
export interface Project {
  id: string;
  company: string;
  name: string;
  status: "進行中" | "要確認" | "計画中";
  progress: number;
  due: string;
  members: string[];
}
export interface CalendarEvent {
  id: string;
  time: string;
  title: string;
  location: string;
  color: string;
}
export interface Approval {
  id: string;
  title: string;
  requester: string;
  date: string;
  amount: number;
}
export interface Notice {
  id: string;
  date: string;
  category: string;
  title: string;
  body: string;
}
export interface ActionItem {
  id: string;
  title: string;
  detail: string;
  path: string;
}
export interface DashboardData {
  tasks: Task[];
  projects: Project[];
  events: CalendarEvent[];
  approvals: Approval[];
  notices: Notice[];
  actions: ActionItem[];
  renewals: { id: string; title: string; days: number; owner: string }[];
  revenue: {
    sales: number;
    receipts: number;
    target: number;
    months: { month: string; sales: number; receipts: number }[];
  };
}
export interface WorkspaceRepository {
  getDashboard(signal?: AbortSignal): Promise<DashboardData>;
  getCompletedTasks(userId: string): string[];
  saveCompletedTasks(userId: string, ids: string[]): void;
  getReadNotifications(userId: string): string[];
  saveReadNotifications(userId: string, ids: string[]): void;
}
