import { ApiError, API_BASE_URL, http, tokens } from '../api/http';
import { localDatabase, STORES } from '../offline/database';
import { enqueueOperation } from '../offline/sync-engine';

/**
 * Drive access for applications.
 *
 * Reads fall back to the local IndexedDB cache when the server is unreachable,
 * and writes are queued in the sync engine so work performed offline is never
 * lost (CLAUDE.md §18–§20). Callers get an optimistic result immediately and
 * the operation's state is reported through the sync UI.
 */
export interface FileItemPayload {
  name: string;
  type?: 'file' | 'folder';
  parentId?: string | null;
  content?: string;
  mimeType?: string;
  starred?: boolean;
  pinned?: boolean;
}

export interface FileVersion {
  id: string;
  versionNo: number;
  size: number;
  mimeType: string;
  comment: string | null;
  createdAt: string;
}

export type ResourceRole = 'owner' | 'editor' | 'commenter' | 'viewer';

export interface FileItemResponse {
  id: string;
  /** Legacy alias still read by some applications. */
  _id: string;
  name: string;
  type: 'file' | 'folder';
  mimeType: string;
  size: number;
  parentId: string | null;
  ownerId: string;
  storageKey: string;
  content?: string;
  starred: boolean;
  pinned: boolean;
  version: number;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown>;
  versions?: FileVersion[];
  /** Set on records that exist only locally, awaiting synchronisation. */
  pendingSync?: boolean;
  /** True when anyone other than the owner currently has access. */
  isShared?: boolean;
  /** The signed-in user's resolved access level for this item. */
  effectiveRole?: ResourceRole;
  /** Present only on `listSharedWithMe` results. */
  sharedRole?: ResourceRole;
}

export interface ShareView {
  id: string;
  fileId: string;
  principalType: 'user' | 'team' | 'organization' | 'link';
  principalId: string | null;
  principalName: string | null;
  /** Only set for `principalType === 'user'`; teams/links have no @handle. */
  principalUsername: string | null;
  role: ResourceRole;
  message: string | null;
  expiresAt: string | null;
  createdAt: string;
  sharedBy: string;
}

export interface EligibleUser {
  id: string;
  name: string;
  email: string;
  username: string;
  avatarUrl: string | null;
}

export interface FileActivityEntry {
  id: string;
  action: string;
  actorName: string | null;
  createdAt: string;
  metadata: Record<string, unknown>;
}

const OFFLINE_PREFIX = 'offline-';

function offlineId(): string {
  return `${OFFLINE_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function isOfflineRecord(file: Pick<FileItemResponse, 'id'>): boolean {
  return file.id.startsWith(OFFLINE_PREFIX);
}

function isOffline(error: unknown): error is ApiError {
  return error instanceof ApiError && error.isOffline;
}

async function cacheFiles(files: FileItemResponse[]): Promise<void> {
  if (!localDatabase.isSupported()) return;
  try {
    await localDatabase.putAll(STORES.files, files);
  } catch {
    // A full or blocked local database must not break a working online session.
  }
}

async function cachedChildren(parentId: string | null): Promise<FileItemResponse[]> {
  if (!localDatabase.isSupported()) return [];
  try {
    const all = await localDatabase.getAll<FileItemResponse>(STORES.files);
    return all.filter((file) => (file.parentId ?? null) === parentId && !file.deletedAt);
  } catch {
    return [];
  }
}

export class FileServiceClass {
  async listChildren(parentId: string | null = null): Promise<FileItemResponse[]> {
    try {
      const data = await http.get<{ files: FileItemResponse[] }>(
        parentId ? `/files/children/${parentId}` : '/files/children',
      );
      await cacheFiles(data.files);
      return data.files;
    } catch (error) {
      if (isOffline(error)) {
        return cachedChildren(parentId);
      }
      throw error;
    }
  }

  async getFile(fileId: string): Promise<FileItemResponse | null> {
    try {
      const data = await http.get<{ file: FileItemResponse }>(`/files/${fileId}`);
      await cacheFiles([data.file]);
      return data.file;
    } catch (error) {
      if (isOffline(error)) {
        return (await localDatabase.get<FileItemResponse>(STORES.files, fileId)) ?? null;
      }
      if (error instanceof ApiError && error.code === 'not_found') return null;
      throw error;
    }
  }

  /**
   * Creates a file. Offline, the file exists locally straight away with a
   * temporary id and the create is queued.
   */
  async createFile(payload: FileItemPayload): Promise<FileItemResponse> {
    try {
      const data = await http.post<{ file: FileItemResponse }>('/files', payload);
      await cacheFiles([data.file]);
      return data.file;
    } catch (error) {
      if (!isOffline(error)) throw error;

      const now = new Date().toISOString();
      const local: FileItemResponse = {
        id: offlineId(),
        _id: offlineId(),
        name: payload.name,
        type: payload.type ?? 'file',
        mimeType: payload.mimeType ?? 'application/octet-stream',
        size: payload.content ? new Blob([payload.content]).size : 0,
        parentId: payload.parentId ?? null,
        ownerId: 'local',
        storageKey: '',
        ...(payload.content !== undefined ? { content: payload.content } : {}),
        starred: false,
        pinned: false,
        version: 1,
        deletedAt: null,
        createdAt: now,
        updatedAt: now,
        metadata: {},
        pendingSync: true,
      };

      await cacheFiles([local]);
      await enqueueOperation({
        label: `Create "${payload.name}"`,
        resource: 'file',
        resourceId: local.id,
        method: 'POST',
        path: '/files',
        body: payload,
      });

      return local;
    }
  }

  async updateFile(fileId: string, updates: Partial<FileItemPayload>): Promise<FileItemResponse> {
    try {
      const data = await http.patch<{ file: FileItemResponse }>(`/files/${fileId}`, updates);
      await cacheFiles([data.file]);
      return data.file;
    } catch (error) {
      if (!isOffline(error)) throw error;

      const cached = await localDatabase.get<FileItemResponse>(STORES.files, fileId);
      const local: FileItemResponse = {
        ...(cached ?? ({ id: fileId, _id: fileId } as FileItemResponse)),
        ...updates,
        updatedAt: new Date().toISOString(),
        pendingSync: true,
      } as FileItemResponse;

      await cacheFiles([local]);

      // A file that only exists locally is still covered by its queued create;
      // queueing an update for a temporary id would fail on the server.
      if (!isOfflineRecord(local)) {
        await enqueueOperation({
          label: `Save "${local.name}"`,
          resource: 'file',
          resourceId: fileId,
          method: 'PATCH',
          path: `/files/${fileId}`,
          body: updates,
        });
      }

      return local;
    }
  }

  async moveFile(fileId: string, targetParentId: string | null): Promise<FileItemResponse> {
    try {
      const data = await http.patch<{ file: FileItemResponse }>(`/files/${fileId}/move`, {
        parentId: targetParentId,
      });
      await cacheFiles([data.file]);
      return data.file;
    } catch (error) {
      if (!isOffline(error)) throw error;

      const cached = await localDatabase.get<FileItemResponse>(STORES.files, fileId);
      const local = { ...(cached as FileItemResponse), parentId: targetParentId, pendingSync: true };
      await cacheFiles([local]);
      await enqueueOperation({
        label: `Move "${local?.name ?? 'item'}"`,
        resource: 'file',
        resourceId: fileId,
        method: 'PATCH',
        path: `/files/${fileId}/move`,
        body: { parentId: targetParentId },
      });
      return local;
    }
  }

  async deleteFile(fileId: string): Promise<void> {
    try {
      await http.delete(`/files/${fileId}`);
      await localDatabase.delete(STORES.files, fileId);
    } catch (error) {
      if (!isOffline(error)) throw error;

      const cached = await localDatabase.get<FileItemResponse>(STORES.files, fileId);
      if (cached) {
        await cacheFiles([{ ...cached, deletedAt: new Date().toISOString(), pendingSync: true }]);
      }
      await enqueueOperation({
        label: `Delete "${cached?.name ?? 'item'}"`,
        resource: 'file',
        resourceId: fileId,
        method: 'DELETE',
        path: `/files/${fileId}`,
      });
    }
  }

  async restoreFile(fileId: string): Promise<FileItemResponse> {
    const data = await http.patch<{ file: FileItemResponse }>(`/files/${fileId}/restore`);
    await cacheFiles([data.file]);
    return data.file;
  }

  async permanentDeleteFile(fileId: string): Promise<void> {
    await http.delete(`/files/${fileId}/permanent`);
    await localDatabase.delete(STORES.files, fileId);
  }

  async listDeleted(): Promise<FileItemResponse[]> {
    try {
      const data = await http.get<{ files: FileItemResponse[] }>('/files/trash');
      return data.files;
    } catch (error) {
      if (isOffline(error)) return [];
      throw error;
    }
  }

  /** Falls back to a local name match when search cannot reach the server. */
  async search(query: string): Promise<FileItemResponse[]> {
    try {
      const data = await http.get<{ files: FileItemResponse[] }>('/files/search', { query: { q: query } });
      return data.files;
    } catch (error) {
      if (!isOffline(error)) throw error;

      const all = await localDatabase.getAll<FileItemResponse>(STORES.files).catch(() => []);
      const needle = query.toLowerCase();
      return all.filter((file) => !file.deletedAt && file.name.toLowerCase().includes(needle));
    }
  }

  async listStarred(): Promise<FileItemResponse[]> {
    try {
      const data = await http.get<{ files: FileItemResponse[] }>('/files/starred');
      return data.files;
    } catch (error) {
      if (!isOffline(error)) throw error;
      const all = await localDatabase.getAll<FileItemResponse>(STORES.files).catch(() => []);
      return all.filter((file) => file.starred && !file.deletedAt);
    }
  }

  async listPinned(): Promise<FileItemResponse[]> {
    try {
      const data = await http.get<{ files: FileItemResponse[] }>('/files/pinned');
      return data.files;
    } catch (error) {
      if (!isOffline(error)) throw error;
      const all = await localDatabase.getAll<FileItemResponse>(STORES.files).catch(() => []);
      return all.filter((file) => file.pinned && !file.deletedAt);
    }
  }

  async listRecent(): Promise<FileItemResponse[]> {
    const data = await http.get<{ files: FileItemResponse[] }>('/files/recent');
    return data.files;
  }

  async toggleStar(fileId: string): Promise<FileItemResponse> {
    const data = await http.patch<{ file: FileItemResponse }>(`/files/${fileId}/star`);
    await cacheFiles([data.file]);
    return data.file;
  }

  async togglePin(fileId: string): Promise<FileItemResponse> {
    const data = await http.patch<{ file: FileItemResponse }>(`/files/${fileId}/pin`);
    await cacheFiles([data.file]);
    return data.file;
  }

  async breadcrumbs(fileId: string): Promise<Array<{ id: string; name: string }>> {
    const data = await http.get<{ path: Array<{ id: string; name: string }> }>(`/files/${fileId}/breadcrumbs`);
    return data.path;
  }

  // ------------------------------------------------------------- binary

  /**
   * Uploads a file with progress reporting. XHR is used rather than fetch
   * because upload progress events are not exposed by fetch.
   */
  upload(
    file: File,
    options: { parentId?: string | null; onProgress?: (percent: number) => void; signal?: AbortSignal } = {},
  ): Promise<FileItemResponse> {
    return new Promise((resolve, reject) => {
      const form = new FormData();
      form.append('file', file);
      if (options.parentId) form.append('parentId', options.parentId);

      const request = new XMLHttpRequest();
      request.open('POST', `${API_BASE_URL}/files/upload`);

      const token = tokens.access();
      if (token) request.setRequestHeader('Authorization', `Bearer ${token}`);
      const organizationId = tokens.organization();
      if (organizationId) request.setRequestHeader('X-Organization-Id', organizationId);

      request.upload.onprogress = (event) => {
        if (event.lengthComputable && options.onProgress) {
          options.onProgress(Math.round((event.loaded / event.total) * 100));
        }
      };

      request.onload = () => {
        let body: { file?: FileItemResponse; error?: { code?: string; message?: string } } = {};
        try {
          body = JSON.parse(request.responseText);
        } catch {
          // Fall through to the status-based error below.
        }

        if (request.status >= 200 && request.status < 300 && body.file) {
          void cacheFiles([body.file]);
          resolve(body.file);
          return;
        }

        reject(
          new ApiError({
            message: body.error?.message ?? `Upload failed with status ${request.status}`,
            code: (body.error?.code as never) ?? 'internal_error',
            status: request.status,
          }),
        );
      };

      request.onerror = () =>
        reject(
          new ApiError({
            message: `"${file.name}" could not be uploaded because the connection was interrupted. Your local copy is safe.`,
            code: 'offline',
            status: 0,
            retryable: true,
          }),
        );

      request.onabort = () =>
        reject(new ApiError({ message: 'Upload cancelled', code: 'validation_error', status: 0 }));

      options.signal?.addEventListener('abort', () => request.abort());

      request.send(form);
    });
  }

  /** Short-lived direct URL; bytes are served by storage, not by the API. */
  async downloadUrl(fileId: string, versionId?: string): Promise<string> {
    const data = await http.get<{ download: { url: string } }>(`/files/${fileId}/download`, {
      ...(versionId ? { query: { versionId } } : {}),
    });
    return data.download.url;
  }

  async listVersions(fileId: string): Promise<FileVersion[]> {
    const data = await http.get<{ versions: FileVersion[] }>(`/files/${fileId}/versions`);
    return data.versions;
  }

  async restoreVersion(fileId: string, versionId: string): Promise<FileItemResponse> {
    const data = await http.post<{ file: FileItemResponse }>(`/files/${fileId}/versions/${versionId}/restore`);
    await cacheFiles([data.file]);
    return data.file;
  }

  // ------------------------------------------------------------ sharing
  /**
   * `target.userId` is preferred whenever the caller already resolved a
   * specific person (e.g. picked from `searchEligibleUsers` suggestions) so
   * the share is created for the exact account the user selected, not a
   * re-lookup of typed text.
   */
  async shareWithUser(
    fileId: string,
    target: { userId?: string; usernameOrEmail?: string },
    role: ResourceRole = 'viewer',
  ): Promise<void> {
    await http.post(`/shares/files/${fileId}/users`, { ...target, role });
  }

  async createShareLink(fileId: string, role: ResourceRole = 'viewer', expiresAt?: string): Promise<string> {
    const data = await http.post<{ token: string }>(`/shares/files/${fileId}/links`, {
      role,
      ...(expiresAt ? { expiresAt } : {}),
    });
    return data.token;
  }

  async listShares(fileId: string): Promise<ShareView[]> {
    const data = await http.get<{ shares: ShareView[] }>(`/shares/files/${fileId}`);
    return data.shares;
  }

  async listSharedWithMe(): Promise<FileItemResponse[]> {
    const data = await http.get<{ files: FileItemResponse[] }>('/shares/shared-with-me');
    return data.files;
  }

  async revokeShare(shareId: string): Promise<void> {
    await http.delete(`/shares/${shareId}`);
  }

  /** Public — no session required. Used by the `/s/:token` landing page. */
  async resolveShareLink(token: string): Promise<{ file: FileItemResponse; role: ResourceRole }> {
    return http.get<{ file: FileItemResponse; role: ResourceRole }>(`/shares/links/${token}`, { anonymous: true });
  }

  async searchEligibleUsers(fileId: string, query: string): Promise<EligibleUser[]> {
    const data = await http.get<{ users: EligibleUser[] }>(`/shares/files/${fileId}/eligible-users`, {
      query: { q: query },
    });
    return data.users;
  }

  async listFileActivity(fileId: string): Promise<FileActivityEntry[]> {
    const data = await http.get<{ activity: FileActivityEntry[] }>(`/shares/files/${fileId}/activity`);
    return data.activity;
  }
}

export const FileService = new FileServiceClass();
