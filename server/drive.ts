import { importPKCS8, SignJWT } from "jose";

export interface DriveEnv {
  GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON?: string;
  POLICIES_APPROVED_FOLDER_ID?: string;
  POLICIES_DRIVE_ID?: string;
  POLICIES_AUTH_MODE?: string;
}
export type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  parents?: string[];
  driveId?: string;
  trashed?: boolean;
  size?: string;
};
export class DriveError extends Error {
  constructor(
    public code: string,
    public status: number,
  ) {
    super(code);
  }
}
const DOC = "application/vnd.google-apps.document";
const PDF = "application/pdf";
const ROOT = "https://www.googleapis.com/drive/v3";
const validId = (id: string | undefined): id is string =>
  !!id && /^[a-zA-Z0-9_-]{10,200}$/.test(id);
export function configured(env: DriveEnv) {
  return (
    validId(env.POLICIES_APPROVED_FOLDER_ID) &&
    validId(env.POLICIES_DRIVE_ID) &&
    !!env.GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON
  );
}

// All endpoints and OAuth audiences are fixed; uploaded key metadata cannot select a destination.
export async function accessToken(
  env: DriveEnv,
  send: typeof fetch = fetch,
): Promise<string> {
  if (!configured(env)) throw new DriveError("not_configured", 503);
  try {
    const key = JSON.parse(env.GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON!);
    if (
      key.type !== "service_account" ||
      typeof key.client_email !== "string" ||
      !key.client_email.endsWith(".iam.gserviceaccount.com") ||
      typeof key.private_key !== "string"
    )
      throw new Error("invalid key");
    const signer = await importPKCS8(key.private_key, "RS256");
    const assertion = await new SignJWT({
      scope: "https://www.googleapis.com/auth/drive.readonly",
    })
      .setProtectedHeader({ alg: "RS256", typ: "JWT" })
      .setIssuer(key.client_email)
      .setAudience("https://oauth2.googleapis.com/token")
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(signer);
    const response = await send("https://oauth2.googleapis.com/token", {
      method: "POST",
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }),
      signal: AbortSignal.timeout(15000),
      redirect: "error",
    });
    if (!response.ok)
      throw new DriveError(
        response.status === 429 ? "rate_limited" : "connection_failed",
        response.status === 429 ? 429 : 502,
      );
    const result = (await response.json()) as { access_token?: string };
    if (!result.access_token) throw new Error("missing token");
    return result.access_token;
  } catch (error) {
    if (error instanceof DriveError) throw error;
    throw new DriveError("connection_failed", 502);
  }
}

export class DriveReader {
  constructor(
    private env: DriveEnv,
    private token: string,
    private send: typeof fetch = fetch,
  ) {}
  private async request(path: string, params: Record<string, string> = {}) {
    const url = new URL(ROOT + path);
    for (const [key, value] of Object.entries(params))
      url.searchParams.set(key, value);
    const response = await this.send(url.toString(), {
      headers: { Authorization: `Bearer ${this.token}` },
      redirect: "error",
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      if (response.status === 404) throw new DriveError("not_found", 404);
      if (response.status === 403)
        throw new DriveError("drive_permission_denied", 403);
      if (response.status === 429) throw new DriveError("rate_limited", 429);
      throw new DriveError("connection_failed", 502);
    }
    return response;
  }
  private async metadata(id: string): Promise<DriveFile> {
    return (
      await this.request(`/files/${encodeURIComponent(id)}`, {
        supportsAllDrives: "true",
        fields: "id,name,mimeType,parents,driveId,trashed,modifiedTime,size",
      })
    ).json() as Promise<DriveFile>;
  }
  async checkFolder() {
    const folder = await this.metadata(this.env.POLICIES_APPROVED_FOLDER_ID!);
    if (
      folder.trashed ||
      folder.mimeType !== "application/vnd.google-apps.folder" ||
      folder.driveId !== this.env.POLICIES_DRIVE_ID
    )
      throw new DriveError("folder_unavailable", 503);
  }
  private approved(file: DriveFile) {
    return (
      !file.trashed &&
      file.driveId === this.env.POLICIES_DRIVE_ID &&
      file.parents?.includes(this.env.POLICIES_APPROVED_FOLDER_ID!)
    );
  }
  async list() {
    await this.checkFolder();
    const files: DriveFile[] = [];
    let pageToken = "";
    const seen = new Set<string>();
    do {
      const response = await this.request("/files", {
        q: `'${this.env.POLICIES_APPROVED_FOLDER_ID}' in parents and trashed = false and mimeType != 'application/vnd.google-apps.folder'`,
        corpora: "drive",
        driveId: this.env.POLICIES_DRIVE_ID!,
        supportsAllDrives: "true",
        includeItemsFromAllDrives: "true",
        fields:
          "nextPageToken,incompleteSearch,files(id,name,mimeType,modifiedTime,parents,driveId,trashed)",
        orderBy: "name",
        pageSize: "100",
        ...(pageToken ? { pageToken } : {}),
      });
      const result = (await response.json()) as {
        files?: DriveFile[];
        nextPageToken?: string;
        incompleteSearch?: boolean;
      };
      if (result.incompleteSearch)
        throw new DriveError("incomplete_search", 502);
      files.push(
        ...(result.files ?? []).filter(
          (f) =>
            this.approved(f) &&
            f.mimeType !== "application/vnd.google-apps.shortcut",
        ),
      );
      pageToken = result.nextPageToken ?? "";
      if (
        (pageToken && seen.has(pageToken)) ||
        files.length > 500 ||
        seen.size >= 10
      )
        throw new DriveError("too_many_files", 502);
      seen.add(pageToken);
    } while (pageToken);
    return files.map((f) => ({
      id: f.id,
      name: f.name,
      modifiedTime: f.modifiedTime ?? null,
      format:
        f.mimeType === DOC
          ? "document"
          : f.mimeType === PDF
            ? "pdf"
            : "unsupported",
    }));
  }
  async content(id: string) {
    if (!validId(id)) throw new DriveError("not_found", 404);
    await this.checkFolder();
    const file = await this.metadata(id);
    if (!this.approved(file)) throw new DriveError("not_found", 404);
    if (file.mimeType !== DOC && file.mimeType !== PDF)
      throw new DriveError("unsupported_format", 415);
    const limit = file.mimeType === DOC ? 2_000_000 : 10_000_000;
    if (Number(file.size ?? 0) > limit)
      throw new DriveError("file_too_large", 413);
    const response = await this.request(
      `/files/${encodeURIComponent(id)}${file.mimeType === DOC ? "/export" : ""}`,
      file.mimeType === DOC
        ? { mimeType: "text/plain" }
        : { alt: "media", supportsAllDrives: "true" },
    );
    if (Number(response.headers.get("content-length") ?? 0) > limit) {
      await response.body?.cancel();
      throw new DriveError("file_too_large", 413);
    }
    const reader = response.body?.getReader();
    if (!reader) throw new DriveError("connection_failed", 502);
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.length;
      if (size > limit) {
        await reader.cancel();
        throw new DriveError("file_too_large", 413);
      }
      chunks.push(part.value);
    }
    // If the file was moved or changed while being read, do not return its old contents.
    const after = await this.metadata(id);
    if (!this.approved(after)) throw new DriveError("not_found", 404);
    if (after.modifiedTime !== file.modifiedTime)
      throw new DriveError("document_changed", 409);
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    return { file, bytes, format: file.mimeType === DOC ? "document" : "pdf" };
  }
}
