/// <reference types="vite/client" />
import { StorageService } from './StorageService';

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
      const response = await fetch(`${API_BASE_URL}/health`, {
        method: 'GET',
        headers: this.getHeaders(),
      });
      return response.ok;
    } catch (error) {
      console.error('API Health Check failed:', error);
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
        mobile: payload.mobile?.trim() || undefined
      };

      const response = await fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (!response.ok) {
        return { 
          success: false, 
          message: data.message || data.error || 'Registration failed' 
        };
      }
      return { 
        success: true, 
        message: data.message || 'User registered successfully', 
        data 
      };
    } catch (error: any) {
      console.error('Registration API error:', error);
      return { 
        success: false, 
        message: error.message || 'An error occurred during registration. Please try again.' 
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
          password: payload.passwordHash // maps passwordHash from UI state to password
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        return { 
          success: false, 
          message: data.message || data.error || 'Login failed' 
        };
      }

      // If token is in the response, store it
      const token = data.token || data.data?.token || data.accessToken;
      if (token) {
        this.setToken(token);
      }

      return { 
        success: true, 
        message: data.message || 'Login successful', 
        token,
        user: data.user || data.data?.user || null
      };
    } catch (error: any) {
      console.error('Login API error:', error);
      return { 
        success: false, 
        message: error.message || 'An error occurred during authentication.' 
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
      console.error('Get profile error:', error);
      return null;
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
        return { success: false, message: data.message || 'Error requesting password reset' };
      }
      return { success: true, message: data.message || 'Password reset link sent' };
    } catch (error: any) {
      return { success: false, message: error.message || 'API request failed' };
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
        return { success: false, message: data.message || 'Error resetting password' };
      }
      return { success: true, message: data.message || 'Password reset successful' };
    } catch (error: any) {
      return { success: false, message: error.message || 'API request failed' };
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

      if (!response.ok) return [];
      const data = await response.json();
      return data.workspaces || data.data || [];
    } catch (error) {
      console.error('Get workspaces error:', error);
      return [];
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
      console.error('Create workspace error:', error);
      return null;
    }
  }
}

export const ApiService = new ApiServiceClass();
