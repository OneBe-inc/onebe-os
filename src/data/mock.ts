import type { DashboardData, WorkspaceRepository } from "../domain";
import { isMockAuth } from "./auth";

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
// Business data is still a sample; production access is gated by the Worker session.
// Only task-complete/notification-read UI preferences remain browser-local.
export const mockRepository: WorkspaceRepository = {
  async getDashboard(signal) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    if (isMockAuth)
      return structuredClone((await import("./fixtures")).mockDashboard);
    const response = await fetch("/api/dashboard", {
      credentials: "same-origin",
      cache: "no-store",
      signal,
    });
    if (response.status === 401) {
      window.dispatchEvent(new Event("onebe:session-expired"));
      throw new Error("UNAUTHORIZED");
    }
    if (!response.ok) throw new Error("DASHBOARD_UNAVAILABLE");
    return response.json() as Promise<DashboardData>;
  },
  getCompletedTasks: (id) => read(`onebe:tasks:${id}`),
  saveCompletedTasks: (id, ids) =>
    localStorage.setItem(`onebe:tasks:${id}`, JSON.stringify(ids)),
  getReadNotifications: (id) => read(`onebe:read:${id}`),
  saveReadNotifications: (id, ids) =>
    localStorage.setItem(`onebe:read:${id}`, JSON.stringify(ids)),
};
