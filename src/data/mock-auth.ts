import type { User } from "../domain";
import { mockUser } from "./fixtures";
const KEY = "onebe:mock-session:v1";
export interface AuthService {
  readSession(): User | null;
  signIn(account: "member" | "unregistered", remember: boolean): User;
  signOut(): void;
}
// This adapter is deliberately a UI demo. Server-side OAuth and membership checks
// replace it before handling any private data. Never use client storage as authorization.
export const mockAuth: AuthService = {
  readSession() {
    try {
      const raw = localStorage.getItem(KEY) ?? sessionStorage.getItem(KEY);
      if (!raw) return null;
      const session = JSON.parse(raw);
      if (
        session.user?.id !== mockUser.id ||
        typeof session.expires !== "number" ||
        !Number.isFinite(session.expires) ||
        session.expires <= Date.now()
      ) {
        this.signOut();
        return null;
      }
      return mockUser;
    } catch {
      return null;
    }
  },
  signIn(account, remember) {
    this.signOut();
    if (account !== "member") throw new Error("UNREGISTERED");
    const session = {
      user: mockUser,
      expires: Date.now() + (remember ? 7 * 24 : 8) * 60 * 60 * 1000,
    };
    (remember ? localStorage : sessionStorage).setItem(
      KEY,
      JSON.stringify(session),
    );
    return mockUser;
  },
  signOut() {
    localStorage.removeItem(KEY);
    sessionStorage.removeItem(KEY);
  },
};
