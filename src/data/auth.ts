import type { User } from "../domain";

// DEV is compiled to false in production. No URL or localStorage flag can enable a bypass.
export const isMockAuth =
  import.meta.env.DEV && import.meta.env.VITE_AUTH_MODE === "mock";
let csrfToken: string | null = null;
export const auth = {
  async readSession(signal?: AbortSignal): Promise<User | null> {
    if (isMockAuth) return (await import("./mock-auth")).mockAuth.readSession();
    const response = await fetch("/api/auth/session", {
      credentials: "same-origin",
      cache: "no-store",
      signal,
    });
    if (response.status === 401) {
      csrfToken = null;
      return null;
    }
    if (!response.ok) throw new Error("AUTH_UNAVAILABLE");
    const data = (await response.json()) as { user?: User; csrfToken?: string };
    if (!data.user?.id || typeof data.csrfToken !== "string")
      throw new Error("AUTH_UNAVAILABLE");
    csrfToken = data.csrfToken;
    return data.user;
  },
  async signIn(
    account: "member" | "unregistered",
    remember: boolean,
    returnTo: string,
  ): Promise<User | null> {
    if (isMockAuth)
      return (await import("./mock-auth")).mockAuth.signIn(account, remember);
    const response = await fetch("/api/auth/start", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ remember, returnTo }),
    });
    if (response.status === 503) throw new Error("AUTH_NOT_CONFIGURED");
    if (!response.ok) throw new Error("AUTH_UNAVAILABLE");
    const data = (await response.json()) as { url?: string };
    const destination = new URL(data.url ?? "");
    if (
      destination.origin !== "https://accounts.google.com" ||
      destination.pathname !== "/o/oauth2/v2/auth"
    )
      throw new Error("AUTH_UNAVAILABLE");
    window.location.assign(destination.href);
    return null;
  },
  async signOut(): Promise<void> {
    if (isMockAuth) return (await import("./mock-auth")).mockAuth.signOut();
    const response = await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "same-origin",
      headers: { "X-CSRF-Token": csrfToken ?? "" },
    });
    if (!response.ok) throw new Error("LOGOUT_FAILED");
    csrfToken = null;
  },
};
