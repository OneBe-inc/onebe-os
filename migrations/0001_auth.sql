-- Only pre-registered, active members may sign in. Never seed a real member in Git.
CREATE TABLE members (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL COLLATE NOCASE UNIQUE,
  google_sub TEXT UNIQUE,
  name TEXT NOT NULL,
  department TEXT NOT NULL DEFAULT '',
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE oauth_transactions (
  state_hash TEXT PRIMARY KEY,
  browser_hash TEXT NOT NULL,
  code_verifier TEXT NOT NULL,
  nonce TEXT NOT NULL,
  return_to TEXT NOT NULL,
  remember INTEGER NOT NULL CHECK (remember IN (0, 1)),
  expires_at INTEGER NOT NULL
);
CREATE INDEX oauth_expiry ON oauth_transactions(expires_at);

CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  csrf_token TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX session_member ON sessions(member_id);
CREATE INDEX session_expiry ON sessions(expires_at);
