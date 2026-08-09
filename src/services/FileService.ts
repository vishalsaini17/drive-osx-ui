import { StorageService } from './StorageService';
import { useSystemStore } from '../systemStore';

export interface FileItemPayload {
  name: string;
  type: 'file' | 'folder';
  parentId?: string | null;
  content?: string;
  mimeType?: string;
  starred?: boolean;
}

export interface FileItemResponse {
  _id: string;
  name: string;
  type: 'file' | 'folder';
  mimeType: string;
  size: number;
  parentId: string | null;
  ownerId: string;
  storageKey: string;
  content: string;
  starred: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, string>;
  versions: any[];
}

const OFFLINE_PREFIX = 'offline-';

function isServerUnreachable(error: unknown): boolean {
  return (
    !navigator.onLine ||
    (error instanceof TypeError &&
      (error.message.includes('Failed to fetch') ||
        error.message.includes('NetworkError') ||
        error.message.includes('ERR_CONNECTION_REFUSED') ||
        error.message.includes('ERR_NAME_NOT_RESOLVED')))
  );
}

function notifyApiFailure(appName: string, message: string) {
  try {
    const notify = useSystemStore.getState().notifyApiError;
    if (notify) {
      notify(appName, message);
    }
  } catch (err) {
    console.warn('Could not dispatch system notification:', err);
  }
}

function generateOfflineId() {
  return `${OFFLINE_PREFIX}${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

export class FileServiceClass {
  private getHeaders(): HeadersInit {
    const token = StorageService.get<string | null>('webos-jwt-token', null);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  async listChildren(parentId: string | null = null): Promise<FileItemResponse[]> {
    try {
      const parentParam = parentId || '';
      const response = await fetch(`/api/v1/files/children/${parentParam}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (response.status === 304) {
        return this.getLocalFiles();
      }

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return data.files || [];
    } catch (error) {
      if (isServerUnreachable(error)) {
        notifyApiFailure('File Service', 'File API unreachable. Using local files.');
      }
      return this.getLocalFiles();
    }
  }

  private getLocalFiles(): FileItemResponse[] {
    try {
      const local = StorageService.get<any[]>('webos-files', []);
      return local as FileItemResponse[];
    } catch {
      return [];
    }
  }

  async getFile(fileId: string): Promise<FileItemResponse | null> {
    try {
      const response = await fetch(`/api/v1/files/${fileId}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (response.status === 304) {
        return this.getLocalFile(fileId);
      }

      if (!response.ok) return null;
      const data = await response.json();
      return data.file || null;
    } catch (error) {
      return this.getLocalFile(fileId);
    }
  }

  private getLocalFile(fileId: string): FileItemResponse | null {
    try {
      const localFiles = StorageService.get<any[]>('webos-files', []);
      return localFiles.find((f) => f.id === fileId) as FileItemResponse | null;
    } catch {
      return null;
    }
  }

  async createFile(payload: FileItemPayload): Promise<FileItemResponse> {
    try {
      const response = await fetch(`/api/v1/files`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to create file');
      }
      return data.file;
    } catch (error) {
      if (isServerUnreachable(error)) {
        const offlineFile: FileItemResponse = {
          _id: generateOfflineId(),
          name: payload.name,
          type: payload.type,
          mimeType: payload.mimeType || 'application/octet-stream',
          size: payload.content?.length || 0,
          parentId: payload.parentId || null,
          ownerId: 'offline',
          storageKey: '',
          content: payload.content || '',
          starred: payload.starred || false,
          deletedAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          metadata: {},
          versions: [],
        };
        return offlineFile;
      }
      throw error;
    }
  }

  async updateFile(fileId: string, updates: Partial<FileItemPayload>): Promise<FileItemResponse> {
    try {
      const response = await fetch(`/api/v1/files/${fileId}`, {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify(updates),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to update file');
      }
      return data.file;
    } catch (error) {
      if (isServerUnreachable(error)) {
        const localFiles = StorageService.get<any[]>('webos-files', []);
        const file = localFiles.find((f) => f.id === fileId);
        if (file) {
          const updated = { ...file, ...updates, updatedAt: new Date().toISOString() };
          StorageService.set('webos-files', localFiles.map((f) => (f.id === fileId ? updated : f)));
          return updated as FileItemResponse;
        }
      }
      throw error;
    }
  }

  async moveFile(fileId: string, targetParentId: string | null): Promise<FileItemResponse> {
    try {
      const response = await fetch(`/api/v1/files/${fileId}/move`, {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify({ parentId: targetParentId }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to move file');
      }
      return data.file;
    } catch (error) {
      if (isServerUnreachable(error)) {
        const localFiles = StorageService.get<any[]>('webos-files', []);
        const updated = localFiles.map((f) => (f.id === fileId ? { ...f, parentId: targetParentId } : f));
        StorageService.set('webos-files', updated);
        const file = updated.find((f) => f.id === fileId);
        if (file) return file as FileItemResponse;
      }
      throw error;
    }
  }

  async deleteFile(fileId: string): Promise<void> {
    try {
      const response = await fetch(`/api/v1/files/${fileId}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to delete file');
      }
    } catch (error) {
      if (isServerUnreachable(error)) {
        const localFiles = StorageService.get<any[]>('webos-files', []);
        const file = localFiles.find((f) => f.id === fileId);
        if (file) {
          const trash = StorageService.get<any[]>('webos-trash', []);
          StorageService.set('webos-trash', [...trash, { ...file, deletedAt: new Date().toISOString() }]);
          StorageService.set('webos-files', localFiles.filter((f) => f.id !== fileId));
        }
        return;
      }
      throw error;
    }
  }

  async restoreFile(fileId: string): Promise<FileItemResponse> {
    try {
      const response = await fetch(`/api/v1/files/${fileId}/restore`, {
        method: 'PATCH',
        headers: this.getHeaders(),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to restore file');
      }
      return data.file;
    } catch (error) {
      if (isServerUnreachable(error)) {
        const trash = StorageService.get<any[]>('webos-trash', []);
        const file = trash.find((f) => f.id === fileId);
        if (file) {
          const restored = { ...file, deletedAt: null };
          const localFiles = StorageService.get<any[]>('webos-files', []);
          StorageService.set('webos-files', [...localFiles, restored]);
          StorageService.set('webos-trash', trash.filter((f) => f.id !== fileId));
          return restored as FileItemResponse;
        }
      }
      throw error;
    }
  }

  async permanentDeleteFile(fileId: string): Promise<void> {
    try {
      const response = await fetch(`/api/v1/files/${fileId}/permanent`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to permanently delete file');
      }
    } catch (error) {
      if (isServerUnreachable(error)) {
        const trash = StorageService.get<any[]>('webos-trash', []);
        StorageService.set('webos-trash', trash.filter((f) => f.id !== fileId));
        return;
      }
      throw error;
    }
  }

  async listDeleted(): Promise<FileItemResponse[]> {
    try {
      const response = await fetch(`/api/v1/files/trash`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (response.status === 304) {
        return this.getLocalTrash();
      }

      if (!response.ok) return [];
      const data = await response.json();
      return data.files || [];
    } catch (error) {
      if (isServerUnreachable(error)) {
        notifyApiFailure('File Service', 'File API unreachable. Using local trash.');
      }
      return this.getLocalTrash();
    }
  }

  private getLocalTrash(): FileItemResponse[] {
    try {
      const trash = StorageService.get<any[]>('webos-trash', []);
      return trash as FileItemResponse[];
    } catch {
      return [];
    }
  }

  async search(query: string): Promise<FileItemResponse[]> {
    try {
      const response = await fetch(`/api/v1/files/search?q=${encodeURIComponent(query)}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (response.status === 304) {
        return [];
      }

      if (!response.ok) return [];
      const data = await response.json();
      return data.files || [];
    } catch (error) {
      if (isServerUnreachable(error)) {
        notifyApiFailure('File Service', 'File API unreachable. Search unavailable.');
      }
      return [];
    }
  }

  async listStarred(): Promise<FileItemResponse[]> {
    try {
      const response = await fetch(`/api/v1/files/starred`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (response.status === 304) {
        return this.getLocalStarred();
      }

      if (!response.ok) return [];
      const data = await response.json();
      return data.files || [];
    } catch (error) {
      if (isServerUnreachable(error)) {
        notifyApiFailure('File Service', 'File API unreachable. Using local starred.');
      }
      return this.getLocalStarred();
    }
  }

  private getLocalStarred(): FileItemResponse[] {
    try {
      const localFiles = StorageService.get<any[]>('webos-files', []);
      return localFiles.filter((f) => f.starred) as FileItemResponse[];
    } catch {
      return [];
    }
  }

  async toggleStar(fileId: string): Promise<FileItemResponse> {
    try {
      const response = await fetch(`/api/v1/files/${fileId}/star`, {
        method: 'PATCH',
        headers: this.getHeaders(),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to toggle star');
      }
      return data.file;
    } catch (error) {
      if (isServerUnreachable(error)) {
        const localFiles = StorageService.get<any[]>('webos-files', []);
        const updated = localFiles.map((f) =>
          f.id === fileId ? { ...f, starred: !f.starred } : f
        );
        StorageService.set('webos-files', updated);
        const file = updated.find((f) => f.id === fileId);
        if (file) return file as FileItemResponse;
      }
      throw error;
    }
  }

  async listPinned(): Promise<FileItemResponse[]> {
    try {
      const response = await fetch(`/api/v1/files/pinned`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (response.status === 304) {
        return this.getLocalPinned();
      }

      if (!response.ok) return [];
      const data = await response.json();
      return data.files || [];
    } catch (error) {
      if (isServerUnreachable(error)) {
        notifyApiFailure('File Service', 'File API unreachable. Using local pinned.');
      }
      return this.getLocalPinned();
    }
  }

  private getLocalPinned(): FileItemResponse[] {
    try {
      const localFiles = StorageService.get<any[]>('webos-files', []);
      return localFiles.filter((f) => f.pinned && f.type === 'folder') as FileItemResponse[];
    } catch {
      return [];
    }
  }

  async togglePin(fileId: string): Promise<FileItemResponse> {
    try {
      const response = await fetch(`/api/v1/files/${fileId}/pin`, {
        method: 'PATCH',
        headers: this.getHeaders(),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to toggle pin');
      }
      return data.file;
    } catch (error) {
      if (isServerUnreachable(error)) {
        const localFiles = StorageService.get<any[]>('webos-files', []);
        const updated = localFiles.map((f) =>
          f.id === fileId ? { ...f, pinned: !f.pinned } : f
        );
        StorageService.set('webos-files', updated);
        const file = updated.find((f) => f.id === fileId);
        if (file) return file as FileItemResponse;
      }
      throw error;
    }
  }
}

export const FileService = new FileServiceClass();
