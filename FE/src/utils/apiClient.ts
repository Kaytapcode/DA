import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';
import { tokenStore } from './tokenStore';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
}

interface PaginatedResponse<T = any> {
  success: boolean;
  data: T[];
  pageIndex: number;
  pageSize: number;
  totalCount: number;
  message?: string;
  errors?: string[];
}

interface LoginPayload {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresInSeconds: number;
  refreshTokenExpiresAt?: string;
  user?: { id: string; username: string; email: string; role: string };
  orgId?: string;
}

// Dedupe concurrent refreshes: many 401s in flight share one /auth/refresh call.
let refreshPromise: Promise<string | null> | null = null;

async function performRefresh(): Promise<string | null> {
  const rt = tokenStore.getRefreshToken();
  if (!rt) return null;

  try {
    // Use a bare axios call (not our instrumented instance) so we don't recurse
    // through the 401 interceptor if the refresh itself returns 401.
    // Include X-Org-Id so the BE can preserve org context in the new access token.
    const refreshHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
    const orgId = localStorage.getItem('org_id');
    if (orgId) refreshHeaders['X-Org-Id'] = orgId;

    const res = await axios.post<ApiResponse<LoginPayload>>(
      `${API_BASE_URL}/auth/refresh`,
      { refreshToken: rt },
      { headers: refreshHeaders, timeout: 15000 }
    );
    const body = res.data;
    if (!body?.success || !body.data?.accessToken) return null;
    tokenStore.setAccessToken(body.data.accessToken, body.data.accessTokenExpiresInSeconds);
    tokenStore.setRefreshToken(body.data.refreshToken);
    if (body.data.user) {
      try { localStorage.setItem('auth_user', JSON.stringify(body.data.user)); } catch { /* ignore */ }
    }
    return body.data.accessToken;
  } catch {
    return null;
  }
}

export async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = performRefresh().finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

class ApiClient {
  private axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' },
    });

    this.axiosInstance.interceptors.request.use(
      (config) => {
        const token = tokenStore.getAccessToken();
        if (token) config.headers.Authorization = `Bearer ${token}`;

        // Let the browser set Content-Type (with multipart boundary) for FormData
        if (config.data instanceof FormData) {
          delete config.headers['Content-Type'];
        }

        const orgId = localStorage.getItem('org_id');
        if (orgId) config.headers['X-Org-Id'] = orgId;
        const orgSlug = localStorage.getItem('org_slug');
        if (orgSlug) config.headers['X-Org-Slug'] = orgSlug;

        return config;
      },
      (error) => Promise.reject(error)
    );

    this.axiosInstance.interceptors.response.use(
      (response) => response.data,
      async (error: AxiosError<ApiResponse> & { config?: AxiosRequestConfig & { _retry?: boolean; _skipAuthRefresh?: boolean } }) => {
        const original = error.config;
        const status = error.response?.status;
        const url = original?.url ?? '';

        const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/refresh') || url.includes('/auth/logout');

        if (status === 401 && original && !original._retry && !original._skipAuthRefresh && !isAuthEndpoint) {
          original._retry = true;
          const newToken = await refreshAccessToken();
          if (newToken) {
            original.headers = original.headers ?? {};
            (original.headers as Record<string, string>).Authorization = `Bearer ${newToken}`;
            return this.axiosInstance.request(original);
          }
          // Refresh failed — full session termination
          tokenStore.clear();
          if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }

        // Normalize the rejected payload so callers always get a readable `.message`.
        // ASP.NET FluentValidation/model errors come back as RFC7807 ValidationProblemDetails
        // ({ title, errors: { Field: [msgs] } }) with NO `success`/`message` field — without this
        // mapping the FE showed a generic "Failed to ..." and the real reason (e.g. weak password,
        // duplicate username) was lost. See SysAdmin create-user "works sometimes" bug.
        const data: any = error.response?.data;
        if (data && typeof data === 'object') {
          if (typeof data.message === 'string' && data.message) {
            return Promise.reject(data);
          }
          if (data.errors && typeof data.errors === 'object') {
            const flat = Object.values(data.errors).flat().filter(Boolean) as string[];
            const msg = flat.join(' ') || data.title || 'Request failed.';
            return Promise.reject({ success: false, message: msg, errors: data.errors });
          }
          if (typeof data.title === 'string' && data.title) {
            return Promise.reject({ success: false, message: data.title });
          }
        }
        return Promise.reject(data || { success: false, message: error.message || 'Network error.' });
      }
    );
  }

  get<T = any>(url: string, config = {}) {
    return this.axiosInstance.get<any, ApiResponse<T>>(url, config);
  }

  post<T = any>(url: string, data?: any, config = {}) {
    return this.axiosInstance.post<any, ApiResponse<T>>(url, data, config);
  }

  put<T = any>(url: string, data?: any, config = {}) {
    return this.axiosInstance.put<any, ApiResponse<T>>(url, data, config);
  }

  patch<T = any>(url: string, data?: any, config = {}) {
    return this.axiosInstance.patch<any, ApiResponse<T>>(url, data, config);
  }

  delete<T = any>(url: string, config = {}) {
    return this.axiosInstance.delete<any, ApiResponse<T>>(url, config);
  }

  getStream(url: string, config = {}) {
    return this.axiosInstance.get(url, { ...config, responseType: 'stream' });
  }
}

export const apiClient = new ApiClient();

export type { ApiResponse, PaginatedResponse };
export default apiClient;
