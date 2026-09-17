// Minimal structural types for D1 and the static-asset binding; no Node APIs in Workers.
export interface Statement {
  bind(...values: (string | number | null)[]): Statement;
  first<T>(): Promise<T | null>;
  run(): Promise<unknown>;
}
export interface Database {
  prepare(query: string): Statement;
  batch(statements: Statement[]): Promise<unknown[]>;
}
export interface Env {
  DB: Database;
  ASSETS: { fetch(request: Request): Promise<Response> };
  APP_ORIGIN: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_WORKSPACE_DOMAIN?: string;
}
export interface Member {
  avatar_url: string | null;
  id: string;
  email: string;
  google_sub: string | null;
  name: string;
  department: string;
}
export interface Transaction {
  state_hash: string;
  browser_hash: string;
  code_verifier: string;
  nonce: string;
  return_to: string;
  remember: number;
  expires_at: number;
}
export interface GoogleIdentity {
  picture?: string | null;
  sub: string;
  email: string;
}
