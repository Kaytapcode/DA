import axios, { AxiosInstance, AxiosError } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
}

interface PaginatedResponse<T = unknown> {
  success: boolean;
  data: T[];
  pageIndex: number;
  pageSize: number;
  totalCount: number;
  message?: string;
  errors?: string[];
}

class ApiClient {
  private axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.axiosInstance.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
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
      (error: AxiosError<ApiResponse>) => {
        const isAuthEndpoint = (error.config?.url ?? '').includes('/auth/');
        if (error.response?.status === 401 && !isAuthEndpoint) {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_user');
          localStorage.removeItem('org_id');
          localStorage.removeItem('org_slug');
          localStorage.removeItem('current_org');
          window.location.href = '/login';
        }
        return Promise.reject(error.response?.data || error);
      }
    );
  }

  get<T = unknown>(url: string, config = {}) {
    return this.axiosInstance.get<unknown, ApiResponse<T>>(url, config);
  }

  post<T = unknown>(url: string, data?: unknown, config = {}) {
    return this.axiosInstance.post<unknown, ApiResponse<T>>(url, data, config);
  }

  put<T = unknown>(url: string, data?: unknown, config = {}) {
    return this.axiosInstance.put<unknown, ApiResponse<T>>(url, data, config);
  }

  patch<T = unknown>(url: string, data?: unknown, config = {}) {
    return this.axiosInstance.patch<unknown, ApiResponse<T>>(url, data, config);
  }

  delete<T = unknown>(url: string, config = {}) {
    return this.axiosInstance.delete<unknown, ApiResponse<T>>(url, config);
  }

  getStream(url: string, config = {}) {
    return this.axiosInstance.get(url, { ...config, responseType: 'stream' });
  }
}

export const apiClient = new ApiClient();

export type { ApiResponse, PaginatedResponse };
export default apiClient;
