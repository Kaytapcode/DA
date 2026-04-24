import axios, { AxiosInstance, AxiosError } from 'axios';

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

    // Request interceptor - Add auth token to headers
    this.axiosInstance.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Add org context headers from localStorage if available
        const orgId = localStorage.getItem('org_id');
        if (orgId) config.headers['X-Org-Id'] = orgId;

        const orgSlug = localStorage.getItem('org_slug');
        if (orgSlug) config.headers['X-Org-Slug'] = orgSlug;

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor - Handle errors and expired tokens
    this.axiosInstance.interceptors.response.use(
      (response) => response.data,
      (error: AxiosError<ApiResponse>) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_user');
          localStorage.removeItem('org_id');
          localStorage.removeItem('org_slug');
          localStorage.removeItem('current_org');
          window.location.href = '/login';
        }

        // Return error response data if available
        return Promise.reject(error.response?.data || error);
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
