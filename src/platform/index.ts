import { ApiService } from './api/ApiService';
import { ApiError, tokens } from './api/http';
import { FileService, type FileItemResponse } from './files/FileService';
import { MeetingService } from './meetings/MeetingService';
import { localDatabase } from './offline/database';
import { network, type NetworkStatus } from './offline/network';
import {
  discardOperation,
  drain,
  retryAll,
  retryOperation,
  subscribeToSync,
  syncState,
  type SyncState,
} from './offline/sync-engine';
import { EventBus } from './events/EventBus';
import { AppRegistry } from './registry/AppRegistry';
import { PermissionService } from './permissions/PermissionService';
import { useSystemStore } from '../shell/state/systemStore';

/**
 * The platform API (CLAUDE.md §4).
 *
 * Applications use this surface rather than reaching for HTTP endpoints,
 * storage keys or the shell's internal store. That keeps apps portable: an
 * implementation can move behind this boundary — a different storage provider,
 * a search engine, a service extracted from the monolith — without every
 * application changing.
 */
export const platform = {
  files: {
    list: (parentId: string | null = null) => FileService.listChildren(parentId),
    open: (fileId: string) => FileService.getFile(fileId),
    create: FileService.createFile.bind(FileService),
    save: (fileId: string, content: string) => FileService.updateFile(fileId, { content }),
    rename: (fileId: string, name: string) => FileService.updateFile(fileId, { name }),
    move: FileService.moveFile.bind(FileService),
    trash: FileService.deleteFile.bind(FileService),
    restore: FileService.restoreFile.bind(FileService),
    deleteForever: FileService.permanentDeleteFile.bind(FileService),
    upload: FileService.upload.bind(FileService),
    downloadUrl: FileService.downloadUrl.bind(FileService),
    versions: FileService.listVersions.bind(FileService),
    restoreVersion: FileService.restoreVersion.bind(FileService),
    share: FileService.shareWithUser.bind(FileService),
    shareLink: FileService.createShareLink.bind(FileService),
    listShares: FileService.listShares.bind(FileService),
    sharedWithMe: FileService.listSharedWithMe.bind(FileService),
    revokeShare: FileService.revokeShare.bind(FileService),
    trashed: FileService.listDeleted.bind(FileService),
    starred: FileService.listStarred.bind(FileService),
    pinned: FileService.listPinned.bind(FileService),
    recent: FileService.listRecent.bind(FileService),
    breadcrumbs: FileService.breadcrumbs.bind(FileService),
  },

  windows: {
    open: (appId: string) => useSystemStore.getState().openAppWindow(appId),
    close: (windowId: string) => useSystemStore.getState().handleCloseWindow(windowId),
    focus: (windowId: string) => useSystemStore.getState().focusWindow(windowId),
    minimize: (windowId: string) => useSystemStore.getState().handleMinimizeWindow(windowId),
    maximize: (windowId: string) => useSystemStore.getState().handleMaximizeWindow(windowId),
    list: () => useSystemStore.getState().windows,
    active: () => useSystemStore.getState().activeWindowId,
  },

  notifications: {
    show: (sender: string, text: string, type: 'info' | 'error' | 'warning' | 'success' = 'info') =>
      useSystemStore.getState().addNotification({ sender, text, type }),
    list: () => ApiService.getNotifications(),
    markRead: (notificationId: string) => ApiService.markNotificationRead(notificationId),
  },

  clipboard: {
    async copy(text: string): Promise<boolean> {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {
        // Clipboard access is permission-gated and fails in insecure contexts.
        return false;
      }
    },

    async read(): Promise<string | null> {
      try {
        return await navigator.clipboard.readText();
      } catch {
        return null;
      }
    },
  },

  search: {
    query: (term: string) => ApiService.search(term),
    files: (term: string) => FileService.search(term),
  },

  auth: {
    currentUser: () => ApiService.getProfile(),
    isAuthenticated: () => Boolean(tokens.access()),
    organizationId: () => tokens.organization(),
    signOut: async () => {
      await ApiService.logout();
      await localDatabase.clearAll().catch(() => undefined);
    },
  },

  organizations: {
    list: () => ApiService.getWorkspaces(),
    create: ApiService.createWorkspace.bind(ApiService),
    switch: ApiService.switchWorkspace.bind(ApiService),
    storage: ApiService.getStorageSummary.bind(ApiService),
  },

  mail: {
    inbox: () => ApiService.getInbox(),
    sent: () => ApiService.getSent(),
    starred: () => ApiService.getStarred(),
    folder: (folder: string) => ApiService.getFolder(folder),
    send: ApiService.sendMail.bind(ApiService),
    unreadCount: ApiService.getUnreadCount.bind(ApiService),
  },

  meetings: MeetingService,

  network: {
    status: (): NetworkStatus => network.status(),
    isOnline: () => network.isOnline(),
    subscribe: network.subscribe,
  },

  sync: {
    status: (): Promise<SyncState> => syncState(),
    subscribe: subscribeToSync,
    flush: drain,
    retry: retryOperation,
    retryAll,
    discard: discardOperation,
  },

  events: EventBus,
  apps: AppRegistry,
  permissions: PermissionService,
};

export type Platform = typeof platform;
export type { FileItemResponse, SyncState, NetworkStatus };
export { ApiError };
