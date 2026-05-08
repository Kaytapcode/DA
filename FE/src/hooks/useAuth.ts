import { useState, useCallback, useEffect } from 'react';
import { apiClient } from '@/utils/apiClient';

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  role: string;
  isSystemAdmin: boolean;
}

export interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  orgId: string | null;
  login: (usernameOrEmail: string, password: string, orgId?: string) => Promise<AuthUser>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  setOrgContext: (orgId: string) => void;
}

const STORAGE_KEYS = {
  TOKEN: 'auth_token',
  USER: 'auth_user',
  ORG_ID: 'org_id',
} as const;

export const useAuth = (): AuthContextType => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const storedToken = localStorage.getItem(STORAGE_KEYS.TOKEN);
      const storedUser = localStorage.getItem(STORAGE_KEYS.USER);
      const storedOrgId = localStorage.getItem(STORAGE_KEYS.ORG_ID);

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        if (storedOrgId) setOrgId(storedOrgId);
      }
    } catch {
      localStorage.clear();
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (usernameOrEmail: string, password: string, orgIdParam?: string) => {
    setIsLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (orgIdParam) headers['X-Org-Id'] = orgIdParam;

      const response = await apiClient.post<{
        token: string;
        message: string;
        user: { id: string; username: string; email: string; role: string; isSystemAdmin: boolean };
        orgId?: string;
      // Backend accepts username or email in the "username" field
      }>('/auth/login', { username: usernameOrEmail, password }, { headers }).catch((err: unknown) => {
        const msg = (err as Record<string, unknown>)?.message;
        throw new Error(typeof msg === 'string' ? msg : 'Invalid login credentials.');
      });

      if (!response.success || !response.data) throw new Error(response.message || 'Login failed');

      const { token: newToken, user: userData, orgId: returnedOrgId } = response.data;

      const authUser: AuthUser = {
        id: userData.id,
        username: userData.username,
        email: userData.email,
        role: userData.role,
        isSystemAdmin: userData.isSystemAdmin,
      };

      setToken(newToken);
      setUser(authUser);
      const resolvedOrgId = returnedOrgId || orgIdParam || null;
      setOrgId(resolvedOrgId);

      localStorage.setItem(STORAGE_KEYS.TOKEN, newToken);
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(authUser));
      if (resolvedOrgId) localStorage.setItem(STORAGE_KEYS.ORG_ID, resolvedOrgId);

      return authUser;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (username: string, email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await apiClient.post('/auth/register', { username, email, password }).catch((err: unknown) => {
        const msg = (err as Record<string, unknown>)?.message;
        throw new Error(typeof msg === 'string' ? msg : 'Registration failed. Please try again.');
      });
      if (!response.success) throw new Error(response.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    setOrgId(null);
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem(STORAGE_KEYS.ORG_ID);
  }, []);

  const setOrgContext = useCallback((newOrgId: string) => {
    setOrgId(newOrgId);
    localStorage.setItem(STORAGE_KEYS.ORG_ID, newOrgId);
  }, []);

  return {
    user,
    token,
    isLoading,
    isAuthenticated: !!token && !!user,
    orgId,
    login,
    register,
    logout,
    setOrgContext,
  };
};
