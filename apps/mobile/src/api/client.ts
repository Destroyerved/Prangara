/**
 * API client.
 *
 * One place that knows how to talk to the backend, so no screen builds a URL or
 * decides what a failure means.
 *
 * Three things it handles that a factory-floor app genuinely needs:
 *
 *  - Token refresh on 401, with a single in-flight refresh shared by every
 *    concurrent request. Five screens hitting an expired token must produce one
 *    refresh, not five, or the rotation in the backend invalidates itself.
 *  - Typed errors. The backend returns {error: {code, message, details}} for
 *    every failure, so the UI can show the message and branch on the code
 *    instead of parsing prose.
 *  - An explicit timeout. A phone on a factory network fails slowly, and a
 *    request that hangs forever looks identical to a frozen app.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

import { clearTokens, loadTokens, saveTokens } from '../storage/tokens';
import type { ApiErrorBody, TokenResponse } from './types';

const DEFAULT_TIMEOUT_MS = 20000;
const CUSTOM_URL_KEY = 'prangara.apiBaseUrl';

/**
 * Resolution order: EXPO_PUBLIC_API_URL, then the host the dev server is served
 * from (so a physical Android device talks to the laptop rather than to itself),
 * then localhost.
 */
let customBaseUrl: string | null = null;

/**
 * Point the app at a different backend. Persisted, because someone who typed
 * their own server address into an installed APK should not have to type it
 * again every time the app is opened.
 */
export function setCustomBaseUrl(url: string | null) {
  customBaseUrl = url ? url.trim().replace(/\/$/, '') : null;
  if (customBaseUrl) {
    AsyncStorage.setItem(CUSTOM_URL_KEY, customBaseUrl).catch(() => undefined);
  } else {
    AsyncStorage.removeItem(CUSTOM_URL_KEY).catch(() => undefined);
  }
}

/**
 * Restore a stored endpoint. Must finish before the first request goes out, so
 * the app awaits it on cold start rather than firing it and hoping.
 */
export async function restoreCustomBaseUrl(): Promise<string | null> {
  try {
    const stored = await AsyncStorage.getItem(CUSTOM_URL_KEY);
    if (stored) customBaseUrl = stored.replace(/\/$/, '');
  } catch {
    /* a missing preference is not an error */
  }
  return customBaseUrl;
}

export function getBaseUrl(): string {
  if (customBaseUrl) return customBaseUrl;
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');

  const hostUri =
    Constants.expoConfig?.hostUri ??
    (Constants.expoGoConfig as { debuggerHost?: string } | undefined)?.debuggerHost;
  if (hostUri) {
    const host = hostUri.split(':')[0];
    if (host) return `http://${host}:8000`;
  }
  // Default for a standalone APK: the deployed API, reachable from any network.
  return 'https://prangara.vercel.app';
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: Record<string, unknown>;

  constructor(status: number, body: ApiErrorBody) {
    super(body.message);
    this.name = 'ApiError';
    this.status = status;
    this.code = body.code;
    this.details = body.details ?? {};
  }

  /** True when retrying later could plausibly work. */
  get isTransient(): boolean {
    return this.status === 0 || this.status >= 500;
  }
}

export class NetworkError extends Error {
  constructor(message = 'Could not reach PRANGARA. Check your connection.') {
    super(message);
    this.name = 'NetworkError';
  }
}

type Listener = () => void;
const signedOutListeners = new Set<Listener>();

/** Called when the session is gone for good and the UI must return to sign-in. */
export function onSignedOut(listener: Listener): () => void {
  signedOutListeners.add(listener);
  return () => signedOutListeners.delete(listener);
}

async function forceSignOut(): Promise<void> {
  await clearTokens();
  signedOutListeners.forEach((listener) => listener());
}

let activeOrganizationId: string | null = null;
export function setActiveOrganization(id: string | null): void {
  activeOrganizationId = id;
}

// A single shared refresh. Concurrent 401s wait on this one promise.
let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const tokens = await loadTokens();
    if (!tokens?.refreshToken) return null;
    try {
      const response = await fetch(`${getBaseUrl()}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: tokens.refreshToken }),
      });
      if (!response.ok) {
        await forceSignOut();
        return null;
      }
      const next = (await response.json()) as TokenResponse;
      await saveTokens({
        accessToken: next.access_token,
        refreshToken: next.refresh_token,
      });
      return next.access_token;
    } catch {
      // A network failure is not an invalid session. Keep the tokens so the
      // user is not signed out because a lift blocked the signal.
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  /** Multipart body. When set, `body` is ignored and no JSON header is sent. */
  form?: FormData;
  query?: Record<string, string | number | boolean | undefined | null>;
  auth?: boolean;
  timeoutMs?: number;
  /** Internal: prevents a refresh loop. */
  _retried?: boolean;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const {
    method = 'GET',
    body,
    form,
    query,
    auth = true,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  } = options;

  let url = `${getBaseUrl()}${path}`;
  if (query) {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });
    const qs = params.toString();
    if (qs) url += `?${qs}`;
  }

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (auth) {
    const tokens = await loadTokens();
    if (tokens?.accessToken) headers.Authorization = `Bearer ${tokens.accessToken}`;
    if (activeOrganizationId) headers['X-Organization-Id'] = activeOrganizationId;
  }
  if (!form && body !== undefined) headers['Content-Type'] = 'application/json';

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: form ?? (body !== undefined ? JSON.stringify(body) : undefined),
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timer);
    if ((error as Error).name === 'AbortError') {
      throw new NetworkError('That took too long. The network here may be weak.');
    }
    throw new NetworkError();
  }
  clearTimeout(timer);

  if (response.status === 401 && auth && !options._retried) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return request<T>(path, { ...options, _retried: true });
    }
    await forceSignOut();
  }

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }
  }

  if (!response.ok) {
    const envelope = (parsed as { error?: ApiErrorBody } | null)?.error;
    throw new ApiError(
      response.status,
      envelope ?? {
        code: `http_${response.status}`,
        message: text || 'Something went wrong.',
        details: {},
      },
    );
  }

  return parsed as T;
}

export const api = {
  get: <T>(path: string, query?: RequestOptions['query'], auth = true) =>
    request<T>(path, { method: 'GET', query, auth }),
  post: <T>(path: string, body?: unknown, auth = true) =>
    request<T>(path, { method: 'POST', body, auth }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  upload: <T>(path: string, form: FormData, timeoutMs = 60000) =>
    request<T>(path, { method: 'POST', form, timeoutMs }),
};

/** Human-readable message for any thrown error. Never shows a stack trace. */
export function describeError(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof NetworkError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return 'Something went wrong.';
}
