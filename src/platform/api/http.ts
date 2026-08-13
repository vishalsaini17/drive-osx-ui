/// <reference types="vite/client" />
import { StorageService } from '../storage/StorageService';
import { network } from '../offline/network';

/**
 * Single HTTP entry point for the platform. Everything that talks to the API
 * goes through here so that authentication, token refresh, tenant scoping,
 * error classification and offline detection are handled once rather than
 * re-implemented per service.
 */
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '');

const ACCESS_TOKEN_KEY = 'webos-jwt-token';
const REFRESH_TOKEN_KEY = 'webos-refresh-token';
const ORGANIZATION_KEY = 'webos-organization-id';

/** Mirrors the error codes the API emits, so callers can branch on intent. */
export type ApiErrorCode =
  | 'validation_error'
  | 'authentication_error'
  | 'permission_error'
  | 'not_found'
  | 'conflict'
  | 'quota_exceeded'
  | 'rate_limited'
  | 'storage_error'
  | 'dependency_error'
  | 'internal_error'
  | 'offline';

export interface FieldIssue {
  field: string;
  message: string;
}

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly details: unknown;
  readonly retryable: boolean;
  readonly requestId?: string;

  constructor(init: {
    message: string;
    code: ApiErrorCode;
    status: number;
    details?: unknown;
    retryable?: boolean;
    requestId?: string;
  }) {
    super(init.message);
    this.name = 'ApiError';
    this.code = init.code;
    this.status = init.status;
    this.details = init.details ?? null;
    this.retryable = init.retryable ?? init.status >= 500;
    if (init.requestId) this.requestId = init.requestId;
  }

  /** True when the request never reached the server. */
  get isOffline(): boolean {
    return this.code === 'offline';
  }

  /** Field-level messages, so a form can mark the offending input. */
  get fieldIssues(): FieldIssue[] {
    const details = this.details as { fields?: FieldIssue[] } | null;
    return details?.fields ?? [];
  }
}

export const tokens = {
  access: () => StorageService.get<string | null>(ACCESS_TOKEN_KEY, null),
  refresh: () => StorageService.get<string | null>(REFRESH_TOKEN_KEY, null),
  organization: () => StorageService.get<string | null>(ORGANIZATION_KEY, null),

  save(accessToken: string, refreshToken?: string | null, organizationId?: string | null) {
    StorageService.set(ACCESS_TOKEN_KEY, accessToken);
    if (refreshToken) StorageService.set(REFRESH_TOKEN_KEY, refreshToken);
    if (organizationId) StorageService.set(ORGANIZATION_KEY, organizationId);
  },

  setOrganization(organizationId: string) {
    StorageService.set(ORGANIZATION_KEY, organizationId);
  },

  clear() {
    StorageService.remove(ACCESS_TOKEN_KEY);
    StorageService.remove(REFRESH_TOKEN_KEY);
    StorageService.remove(ORGANIZATION_KEY);
  },
};

type SessionListener = (event: 'expired' | 'refreshed') => void;
const sessionListeners = new Set<SessionListener>();

/** Lets the shell react to a session ending without the API layer importing it. */
export function onSessionEvent(listener: SessionListener): () => void {
  sessionListeners.add(listener);
  return () => sessionListeners.delete(listener);
}

function emitSessionEvent(event: 'expired' | 'refreshed'): void {
  sessionListeners.forEach((listener) => {
    try {
      listener(event);
    } catch {
      // A misbehaving listener must not break the request that triggered it.
    }
  });
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /** Skip the Authorization header (login, registration, public links). */
  anonymous?: boolean;
  /** Skip the one-shot refresh retry — used by the refresh call itself. */
  noRefresh?: boolean;
  timeoutMs?: number;
  query?: Record<string, string | number | boolean | undefined | null>;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  if (!query) return url;

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  }
  const queryString = params.toString();
  return queryString ? `${url}?${queryString}` : url;
}

function headersFor(options: RequestOptions, isFormData: boolean): Headers {
  const headers = new Headers(options.headers as HeadersInit);

  if (!isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (!options.anonymous) {
    const token = tokens.access();
    if (token) headers.set('Authorization', `Bearer ${token}`);

    const organizationId = tokens.organization();
    if (organizationId) headers.set('X-Organization-Id', organizationId);
  }

  return headers;
}

/**
 * A refresh in flight is shared: several 401s from parallel requests must not
 * each rotate the refresh token, which would invalidate the others.
 */
let refreshInFlight: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;

  const refreshToken = tokens.refresh();
  if (!refreshToken) return false;

  refreshInFlight = (async () => {
    try {
      const response = await fetch(buildUrl('/auth/refresh'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        tokens.clear();
        emitSessionEvent('expired');
        return false;
      }

      const data = (await response.json()) as {
        token: string;
        refreshToken: string;
        user?: { organizationId?: string | null };
      };
      tokens.save(data.token, data.refreshToken, data.user?.organizationId ?? null);
      emitSessionEvent('refreshed');
      return true;
    } catch {
      // Network failure: keep the tokens, the session may still be valid.
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

async function toApiError(response: Response): Promise<ApiError> {
  let body: { message?: string; error?: { code?: string; message?: string; details?: unknown; retryable?: boolean; requestId?: string } } = {};

  try {
    body = await response.json();
  } catch {
    // Non-JSON error body (proxy error page, gateway timeout).
  }

  return new ApiError({
    message: body.error?.message || body.message || `Request failed with status ${response.status}`,
    code: (body.error?.code as ApiErrorCode) || 'internal_error',
    status: response.status,
    details: body.error?.details ?? null,
    retryable: body.error?.retryable ?? response.status >= 500,
    ...(body.error?.requestId ? { requestId: body.error.requestId } : {}),
  });
}

function offlineError(message = 'You are offline. The server could not be reached.'): ApiError {
  return new ApiError({ message, code: 'offline', status: 0, retryable: true });
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const isFormData = options.body instanceof FormData;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 30_000);

  const { body: rawBody, anonymous, noRefresh, timeoutMs, query, ...requestInit } = options;
  void anonymous;
  void noRefresh;
  void timeoutMs;
  void query;

  const init: RequestInit = {
    ...requestInit,
    headers: headersFor(options, isFormData),
    signal: options.signal ?? controller.signal,
  };

  if (rawBody !== undefined) {
    init.body = isFormData ? (rawBody as FormData) : JSON.stringify(rawBody);
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path, options.query), init);
    network.reportReachable(true);
  } catch (error) {
    // fetch only rejects on network-level failures; treat them all as offline
    // so the caller can queue the operation instead of losing it.
    network.reportReachable(false);
    throw offlineError(
      navigator.onLine
        ? 'The server could not be reached. Your work is kept locally.'
        : 'You are offline. Your work is kept locally and will sync when you reconnect.',
    );
  } finally {
    clearTimeout(timeout);
  }

  if (response.status === 401 && !options.anonymous && !options.noRefresh) {
    const refreshed = await refreshSession();
    if (refreshed) {
      return request<T>(path, { ...options, noRefresh: true });
    }
    tokens.clear();
    emitSessionEvent('expired');
  }

  if (!response.ok) {
    throw await toApiError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  return text ? (JSON.parse(text) as T) : (undefined as T);
}

export const http = {
  get: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PATCH', body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PUT', body }),
  delete: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: 'DELETE' }),
};
