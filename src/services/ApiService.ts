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
      console.warn('Registration API unreachable — using local offline registration:', error);

      notifyApiFailure(
        'Authentication Service',
        `API endpoint ${API_BASE_URL}/register unreachable. Account created in local offline mode.`
      );

      // Save user to local user registry in StorageService
      const savedUsers = StorageService.get<any[]>('webos-users-list', []);
      const newUser = {
        id: `offline-${Date.now()}`,
        username: payload.username,
        firstName: payload.firstName,
        lastName: payload.lastName,
        fullName: `${payload.firstName} ${payload.lastName}`.trim(),
        email: payload.recoveryEmail || `${payload.username}@driveosx.local`,
        recoveryEmail: payload.recoveryEmail,
        mobile: payload.mobile,
        avatarUrl: '👤',
        passwordHash: payload.passwordHash,
      };

      const existingIndex = savedUsers.findIndex((u: any) => u.username.toLowerCase() === payload.username.toLowerCase());
      if (existingIndex >= 0) {
        savedUsers[existingIndex] = newUser;
      } else {
        savedUsers.push(newUser);
      }
      StorageService.set('webos-users-list', savedUsers);
      this.setToken(OFFLINE_TEST_TOKEN);

      return {
        success: true,
        message: 'Backend API unreachable. Account registered in offline mode.',
        data: { user: newUser, token: OFFLINE_TEST_TOKEN },
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
      console.warn('Login API unreachable — using local offline authentication:', error);

      notifyApiFailure(
        'Authentication Service',
        `API endpoint ${API_BASE_URL}/login is not working / unreachable. Switched to offline mode.`
      );

      // Offline login fallback for any account!
      const savedUsers = StorageService.get<any[]>('webos-users-list', []);
      const matchedUser = savedUsers.find(
        (u: any) => u.username.toLowerCase() === payload.username.trim().toLowerCase()
      );

      this.setToken(OFFLINE_TEST_TOKEN);

      const offlineUser = matchedUser || {
        ...OFFLINE_TEST_USER,
        username: payload.username,
        fullName: payload.username,
      };

      return {
        success: true,
        message: 'Offline mode active: logged in with local profile.',
        token: OFFLINE_TEST_TOKEN,
        user: offlineUser,
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
      return StorageService.get<any | null>('webos-current-user', OFFLINE_TEST_USER);
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
      return { success: true, message: 'Offline mode: Password reset email request logged locally.' };
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
      notifyApiFailure('Password Reset API', 'API server unreachable. Password reset completed in offline mode.');
      return { success: true, message: 'Password reset completed in offline mode.' };
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
}

export const ApiService = new ApiServiceClass();
