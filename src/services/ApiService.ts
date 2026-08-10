/// <reference types="vite/client" />
import { StorageService } from './StorageService';
import { useSystemStore } from '../systemStore';

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '');

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

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

const OFFLINE_TEST_TOKEN = 'offline-test-session-token';
const OFFLINE_TEST_USER = {
  id: 'local-test-user',
  username: 'test',
  firstName: 'Test',
  lastName: 'User',
  fullName: 'Test User',
  email: 'test@driveosx.local',
  recoveryEmail: 'test@driveosx.local',
  mobile: '+10000000000',
  avatarUrl: '🧪',
};

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

class ApiServiceClass {
  private tokenKey = 'webos-jwt-token';

  getToken(): string | null {
    return StorageService.get<string | null>(this.tokenKey, null);
  }

  setToken(token: string): void {
    StorageService.set(this.tokenKey, token);
  }

  clearToken(): void {
    StorageService.remove(this.tokenKey);
  }

  private getHeaders(): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  /**
   * GET /health
   */
  async checkHealth(): Promise<boolean> {
    try {
      if (!navigator.onLine) {
        notifyApiFailure('Network Monitor', 'Internet connection offline. System operating in local mode.');
        return false;
      }
      const response = await fetch(`${API_BASE_URL}/health`, {
        method: 'GET',
        headers: this.getHeaders(),
      });
      return response.ok;
    } catch (error) {
      notifyApiFailure('Backend API', 'API Health check failed. Backend server is unreachable.');
      return false;
    }
  }

  /**
   * POST /register
   */
  async register(payload: {
    username: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    recoveryEmail?: string;
    mobile?: string;
  }): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      const body = {
        username: payload.username,
        password: payload.passwordHash,
        firstName: payload.firstName,
        lastName: payload.lastName,
        recoveryEmail: payload.recoveryEmail?.trim() || undefined,
        mobile: payload.mobile?.trim() || undefined,
      };

      const response = await fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (!response.ok) {
        notifyApiFailure('Registration API', data.message || data.error || 'Registration failed');
        return {
          success: false,
          message: data.message || data.error || 'Registration failed',
        };
      }
      return {
        success: true,
        message: data.message || 'User registered successfully',
        data,
      };
    } catch (error: any) {
      console.warn('Registration API unreachable:', error);

      notifyApiFailure(
        'Authentication Service',
        `API endpoint ${API_BASE_URL}/register unreachable.`
      );

      return {
        success: false,
        message: 'Registration failed. Please check your connection and try again.',
      };
    }
  }

  /**
   * POST /login
   */
  async login(payload: { username: string; passwordHash: string }): Promise<{ success: boolean; message: string; token?: string; user?: any }> {
    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          username: payload.username,
          password: payload.passwordHash,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        notifyApiFailure('Authentication API', data.message || data.error || 'Login failed');
        return {
          success: false,
          message: data.message || data.error || 'Login failed',
        };
      }

      const token = data.token || data.data?.token || data.accessToken;
      if (token) {
        this.setToken(token);
      }

      return {
        success: true,
        message: data.message || 'Login successful',
        token,
        user: data.user || data.data?.user || null,
      };
    } catch (error: unknown) {
      console.warn('Login API unreachable:', error);

      notifyApiFailure(
        'Authentication Service',
        `API endpoint ${API_BASE_URL}/login is not working / unreachable.`
      );

      return {
        success: false,
        message: 'Login failed. Please check your connection and try again.',
      };
    }
  }

  /**
   * GET /profile
   */
  async getProfile(): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/profile`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        if (response.status === 401) {
          this.clearToken();
        }
        return null;
      }

      const data = await response.json();
      return data.user || data.data || data;
    } catch (error) {
      notifyApiFailure('Profile Service', 'Failed to fetch user profile from API. Using local session data.');
      return StorageService.get<any | null>('webos-current-user', null);
    }
  }

  /**
   * POST /forgot-password
   */
  async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/forgot-password`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      if (!response.ok) {
        notifyApiFailure('Password Recovery API', data.message || 'Error requesting password reset');
        return { success: false, message: data.message || 'Error requesting password reset' };
      }
      return { success: true, message: data.message || 'Password reset link sent' };
    } catch (error: any) {
      notifyApiFailure('Password Recovery API', 'API server unreachable. Password reset simulated offline.');
      return { success: false, message: 'Password reset failed. Server is unreachable.' };
    }
  }

  /**
   * POST /reset-password
   */
  async resetPassword(token: string, passwordHash: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/reset-password`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ token, password: passwordHash }),
      });

      const data = await response.json();
      if (!response.ok) {
        notifyApiFailure('Password Reset API', data.message || 'Error resetting password');
        return { success: false, message: data.message || 'Error resetting password' };
      }
      return { success: true, message: data.message || 'Password reset successful' };
    } catch (error: any) {
      notifyApiFailure('Password Reset API', 'API server unreachable. Password reset failed.');
      return { success: false, message: 'Password reset failed. Server is unreachable.' };
    }
  }

  /**
   * GET /workspaces
   */
  async getWorkspaces(): Promise<any[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/workspaces`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) return StorageService.get<any[]>('webos-workspaces', []);
      const data = await response.json();
      return data.workspaces || data.data || [];
    } catch (error) {
      notifyApiFailure('Workspace API', 'Workspaces API unreachable. Loading offline local workspaces.');
      return StorageService.get<any[]>('webos-workspaces', [
        { id: 'ws-local-1', name: 'Local Offline Workspace', type: 'personal' },
      ]);
    }
  }

  /**
   * POST /workspaces
   */
  async createWorkspace(payload: WorkspacePayload): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/workspaces`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) return null;
      const data = await response.json();
      return data.workspace || data.data || data;
    } catch (error) {
      notifyApiFailure('Workspace API', 'API unreachable. Workspace saved to local offline storage.');
      const local = StorageService.get<any[]>('webos-workspaces', []);
      const newWs = { id: `ws-${Date.now()}`, ...payload };
      local.push(newWs);
      StorageService.set('webos-workspaces', local);
      return newWs;
    }
  }

  /**
   * GET /mail/inbox
   */
  async getInbox(): Promise<any[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/mail/inbox`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) return [];
      const data = await response.json();
      return data.emails || data.data || [];
    } catch (error) {
      notifyApiFailure('Mail API', 'Mail API unreachable. Loading offline local emails.');
      return StorageService.get<any[]>('webos-mails-inbox', []);
    }
  }

  /**
   * GET /mail/sent
   */
  async getSent(): Promise<any[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/mail/sent`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) return [];
      const data = await response.json();
      return data.emails || data.data || [];
    } catch (error) {
      notifyApiFailure('Mail API', 'Mail API unreachable. Loading offline sent emails.');
      return StorageService.get<any[]>('webos-mails-sent', []);
    }
  }

  /**
   * GET /mail/starred
   */
  async getStarred(): Promise<any[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/mail/starred`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) return [];
      const data = await response.json();
      return data.emails || data.data || [];
    } catch (error) {
      return [];
    }
  }

  /**
   * POST /mail/send
   */
  async sendMail(payload: { to: string; subject: string; body?: string; cc?: string; bcc?: string; priority?: string; attachments?: any[] }): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/mail/send`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        return { success: false, message: data.message || data.error || 'Failed to send email' };
      }
      return { success: true, message: data.message || 'Email sent' };
    } catch (error) {
      notifyApiFailure('Mail API', 'Mail API unreachable. Email saved to local outbox.');
      const outbox = StorageService.get<any[]>('webos-mails-outbox', []);
      outbox.push({ ...payload, id: `local-${Date.now()}`, timestamp: new Date().toISOString() });
      StorageService.set('webos-mails-outbox', outbox);
      return { success: true, message: 'Offline mode: Email saved to local outbox.' };
    }
  }

  /**
   * GET /mail/unread/count
   */
  async getUnreadCount(folder?: string): Promise<number> {
    try {
      const url = folder ? `${API_BASE_URL}/mail/unread/count?folder=${encodeURIComponent(folder)}` : `${API_BASE_URL}/mail/unread/count`;
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) return 0;
      const data = await response.json();
      return data.count || 0;
    } catch (error) {
      return 0;
    }
  }
}

export const ApiService = new ApiServiceClass();
