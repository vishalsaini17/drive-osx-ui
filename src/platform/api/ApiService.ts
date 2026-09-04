import { ApiError, API_BASE_URL, http, onSessionEvent, tokens } from './http';
import { StorageService } from '../storage/StorageService';
import { useSystemStore } from '../../shell/state/systemStore';

export { API_BASE_URL, ApiError, onSessionEvent };

/**
 * Application-facing client for identity, workspaces and mail.
 *
 * Transport concerns (auth headers, token refresh, tenant scoping, error
 * classification) live in `http.ts`; this module maps the API to the shapes the
 * shell and apps consume, and decides what a failure means for the user.
 */
export interface AuthenticatedUser {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  recoveryEmail: string | null;
  mobile: string | null;
  avatarUrl?: string | null;
  organizationId: string | null;
}

export interface RegisterPayload {
  username: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  recoveryEmail?: string;
  mobile?: string;
}

export interface LoginPayload {
  username: string;
  passwordHash: string;
}

export interface WorkspacePayload {
  name: string;
  type: 'personal' | 'organization';
}

export interface Result<T = undefined> {
  success: boolean;
  message: string;
  data?: T;
  /** Convenience aliases for the common auth payloads. */
  user?: AuthenticatedUser;
  token?: string;
  /** Field-level validation messages, keyed by form field. */
  fieldIssues?: Array<{ field: string; message: string }>;
  /** True when the failure was caused by the server being unreachable. */
  offline?: boolean;
}

function notifyApiFailure(source: string, message: string): void {
  try {
    useSystemStore.getState().notifyApiError?.(source, message);
  } catch {
    // The store may not be initialised yet during boot.
  }
}

/**
 * Converts a thrown error into a Result. Offline failures are reported as such
 * rather than as generic errors, so the UI can say what actually happened.
 */
function toFailure(source: string, error: unknown, fallback: string): Result<never> {
  if (error instanceof ApiError) {
    // Offline is an expected state, not a system fault worth alerting on.
    if (!error.isOffline) {
      notifyApiFailure(source, error.message);
    }
    return {
      success: false,
      message: error.message,
      ...(error.fieldIssues.length > 0 ? { fieldIssues: error.fieldIssues } : {}),
      ...(error.isOffline ? { offline: true } : {}),
    };
  }

  notifyApiFailure(source, fallback);
  return { success: false, message: fallback };
}

class ApiServiceClass {
  // ------------------------------------------------------------- session
  getToken(): string | null {
    return tokens.access();
  }

  setToken(token: string): void {
    tokens.save(token);
  }

  clearToken(): void {
    tokens.clear();
  }

  getOrganizationId(): string | null {
    return tokens.organization();
  }

  async checkHealth(): Promise<boolean> {
    try {
      await http.get('/health', { anonymous: true, timeoutMs: 5_000 });
      return true;
    } catch (error) {
      if (error instanceof ApiError && error.isOffline) {
        notifyApiFailure('Network', 'The server is unreachable. Working in offline mode.');
      }
      return false;
    }
  }

  // ------------------------------------------------------------ identity
  async register(payload: RegisterPayload): Promise<Result<{ user: AuthenticatedUser }>> {
    try {
      const data = await http.post<{ message: string; user: AuthenticatedUser }>(
        '/register',
        {
          username: payload.username,
          password: payload.passwordHash,
          firstName: payload.firstName,
          lastName: payload.lastName,
          recoveryEmail: payload.recoveryEmail?.trim() || undefined,
          mobile: payload.mobile?.trim() || undefined,
        },
        { anonymous: true },
      );

      return { success: true, message: data.message, data: { user: data.user }, user: data.user };
    } catch (error) {
      return toFailure('Registration', error, 'Registration failed. Please try again.');
    }
  }

  async login(payload: LoginPayload): Promise<Result<{ token: string; user: AuthenticatedUser }>> {
    try {
      const data = await http.post<{
        message: string;
        token: string;
        refreshToken: string;
        user: AuthenticatedUser;
      }>('/login', { username: payload.username, password: payload.passwordHash }, { anonymous: true });

      tokens.save(data.token, data.refreshToken, data.user.organizationId);

      return {
        success: true,
        message: data.message,
        data: { token: data.token, user: data.user },
        user: data.user,
        token: data.token,
      };
    } catch (error) {
      return toFailure('Sign in', error, 'Sign in failed. Please check your connection and try again.');
    }
  }

  async logout(): Promise<void> {
    try {
      await http.post('/auth/logout');
    } catch {
      // Signing out locally must succeed even if the server cannot be told.
    } finally {
      tokens.clear();
    }
  }

  /** Returns the cached profile when the API cannot be reached. */
  async getProfile(): Promise<AuthenticatedUser | null> {
    try {
      const data = await http.get<{ user: AuthenticatedUser }>('/profile');
      StorageService.set('webos-current-user', data.user);
      if (data.user.organizationId) tokens.setOrganization(data.user.organizationId);
      return data.user;
    } catch (error) {
      if (error instanceof ApiError && error.code === 'authentication_error') {
        tokens.clear();
        return null;
      }
      return StorageService.get<AuthenticatedUser | null>('webos-current-user', null);
    }
  }

  async updateProfile(patch: Partial<Pick<AuthenticatedUser, 'firstName' | 'lastName' | 'mobile' | 'avatarUrl'>>): Promise<Result<AuthenticatedUser>> {
    try {
      const data = await http.patch<{ user: AuthenticatedUser }>('/profile', patch);
      return { success: true, message: 'Profile updated', data: data.user };
    } catch (error) {
      return toFailure('Profile', error, 'Could not update your profile.');
    }
  }

  async forgotPassword(email: string): Promise<Result<{ resetToken?: string }>> {
    try {
      const data = await http.post<{ message: string; resetToken?: string }>(
        '/forgot-password',
        { email },
        { anonymous: true },
      );
      return { success: true, message: data.message, data: { ...(data.resetToken ? { resetToken: data.resetToken } : {}) } };
    } catch (error) {
      return toFailure('Password recovery', error, 'Could not start password recovery.');
    }
  }

  async resetPassword(token: string, passwordHash: string): Promise<Result> {
    try {
      const data = await http.post<{ message: string }>(
        '/reset-password',
        { token, password: passwordHash },
        { anonymous: true },
      );
      return { success: true, message: data.message };
    } catch (error) {
      return toFailure('Password reset', error, 'Could not reset your password.');
    }
  }

  // -------------------------------------------------------- workspaces
  async getWorkspaces(): Promise<Array<Record<string, unknown>>> {
    try {
      const data = await http.get<{ organizations: Array<Record<string, unknown>> }>('/organizations');
      StorageService.set('webos-workspaces', data.organizations);
      return data.organizations;
    } catch {
      // Workspaces change rarely; the cached list keeps the shell usable.
      return StorageService.get<Array<Record<string, unknown>>>('webos-workspaces', []);
    }
  }

  async createWorkspace(payload: WorkspacePayload): Promise<Result<Record<string, unknown>>> {
    try {
      const data = await http.post<{ organization: Record<string, unknown> }>('/organizations', payload);
      return { success: true, message: 'Workspace created', data: data.organization };
    } catch (error) {
      return toFailure('Workspaces', error, 'Could not create the workspace.');
    }
  }

  async switchWorkspace(organizationId: string): Promise<Result> {
    try {
      await http.post(`/organizations/${organizationId}/switch`);
      tokens.setOrganization(organizationId);
      return { success: true, message: 'Workspace switched' };
    } catch (error) {
      return toFailure('Workspaces', error, 'Could not switch workspace.');
    }
  }

  async getStorageSummary(
    organizationId: string,
  ): Promise<{ usedBytes: number; quotaBytes: number; percentUsed: number } | null> {
    try {
      const data = await http.get<{ storage: { usedBytes: number; quotaBytes: number; percentUsed: number } }>(
        `/organizations/${organizationId}/storage`,
      );
      return data.storage;
    } catch {
      return null;
    }
  }

  // -------------------------------------------------------------- mail
  private async listMail(path: string, cacheKey: string): Promise<Array<Record<string, unknown>>> {
    try {
      const data = await http.get<{ emails: Array<Record<string, unknown>> }>(path);
      StorageService.set(cacheKey, data.emails);
      return data.emails;
    } catch (error) {
      if (error instanceof ApiError && !error.isOffline) {
        notifyApiFailure('Mail', error.message);
      }
      return StorageService.get<Array<Record<string, unknown>>>(cacheKey, []);
    }
  }

  getInbox(): Promise<Array<Record<string, unknown>>> {
    return this.listMail('/mail/inbox', 'webos-mails-inbox');
  }

  getSent(): Promise<Array<Record<string, unknown>>> {
    return this.listMail('/mail/sent', 'webos-mails-sent');
  }

  getStarred(): Promise<Array<Record<string, unknown>>> {
    return this.listMail('/mail/starred', 'webos-mails-starred');
  }

  getFolder(folder: string): Promise<Array<Record<string, unknown>>> {
    return this.listMail(`/mail/folder/${folder}`, `webos-mails-${folder}`);
  }

  /**
   * Sending while offline keeps the message in a local outbox and reports that
   * plainly — the user is never told a message was sent when it was not.
   */
  async sendMail(payload: {
    to: string;
    subject: string;
    body?: string;
    bodyHtml?: string;
    cc?: string;
    bcc?: string;
    priority?: string;
    attachments?: unknown[];
  }): Promise<Result> {
    try {
      const data = await http.post<{ message: string }>('/mail/send', payload);
      return { success: true, message: data.message };
    } catch (error) {
      if (error instanceof ApiError && error.isOffline) {
        const outbox = StorageService.get<unknown[]>('webos-mails-outbox', []);
        outbox.push({ ...payload, id: `local-${Date.now()}`, queuedAt: new Date().toISOString() });
        StorageService.set('webos-mails-outbox', outbox);
        return {
          success: false,
          offline: true,
          message: 'You are offline. The message is saved in your outbox and will be sent when you reconnect.',
        };
      }
      return toFailure('Mail', error, 'The message could not be sent.');
    }
  }

  async getUnreadCount(folder?: string): Promise<number> {
    try {
      const data = await http.get<{ count: number }>('/mail/unread/count', {
        ...(folder ? { query: { folder } } : {}),
      });
      return data.count;
    } catch {
      return 0;
    }
  }

  async markMailRead(emailId: string): Promise<Result> {
    try {
      await http.patch(`/mail/${emailId}/read`);
      return { success: true, message: 'Marked as read' };
    } catch (error) {
      return toFailure('Mail', error, 'Could not update read status.');
    }
  }

  async toggleMailStar(emailId: string): Promise<Result> {
    try {
      await http.patch(`/mail/${emailId}/star`);
      return { success: true, message: 'Star toggled' };
    } catch (error) {
      return toFailure('Mail', error, 'Could not update star.');
    }
  }

  async toggleMailPin(emailId: string): Promise<Result> {
    try {
      await http.patch(`/mail/${emailId}/pin`);
      return { success: true, message: 'Pin toggled' };
    } catch (error) {
      return toFailure('Mail', error, 'Could not update pin.');
    }
  }

  async moveMailToFolder(emailId: string, folder: string): Promise<Result> {
    try {
      await http.patch(`/mail/${emailId}/move`, { folder });
      return { success: true, message: 'Message moved' };
    } catch (error) {
      return toFailure('Mail', error, 'Could not move the message.');
    }
  }

  async deleteMail(emailId: string): Promise<Result> {
    try {
      await http.delete(`/mail/${emailId}`);
      return { success: true, message: 'Message deleted' };
    } catch (error) {
      return toFailure('Mail', error, 'Could not delete the message.');
    }
  }

  // ----------------------------------------------------- notifications
  async getNotifications(): Promise<Array<Record<string, unknown>>> {
    try {
      const data = await http.get<{ notifications: Array<Record<string, unknown>> }>('/notifications');
      return data.notifications;
    } catch {
      return [];
    }
  }

  async markNotificationRead(notificationId: string): Promise<void> {
    try {
      await http.patch(`/notifications/${notificationId}/read`);
    } catch {
      // A read receipt is not worth surfacing an error for.
    }
  }

  // ------------------------------------------------------------ search
  async search(query: string): Promise<Array<{ id: string; type: string; title: string; subtitle: string }>> {
    try {
      const data = await http.get<{
        results: Array<{ id: string; type: string; title: string; subtitle: string }>;
      }>('/search', { query: { q: query } });
      return data.results;
    } catch {
      return [];
    }
  }
}

export const ApiService = new ApiServiceClass();
