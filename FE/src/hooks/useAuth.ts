import { useState, useCallback, useEffect } from 'react';
import { apiClient, refreshAccessToken as doRefresh } from '@/utils/apiClient';
import { tokenStore, RT_STORAGE_KEY } from '@/utils/tokenStore';

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  role: string;
}

export interface LoginResult {
  user: AuthUser;
  orgId: string | null;
}

export interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  orgId: string | null;
  login: (username: string, password: string, orgId?: string) => Promise<LoginResult>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setOrgContext: (orgId: string) => void;
}

const STORAGE_KEYS = {
  USER: 'auth_user',
  ORG_ID: 'org_id',
  ORG_SLUG: 'org_slug',
  CURRENT_ORG: 'current_org',
} as const;

interface LoginApiResponse {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresInSeconds: number;
  refreshTokenExpiresAt?: string;
  message: string;
  user: { id: string; username: string; email: string; role: string };
  orgId?: string;
}

export const useAuth = (): AuthContextType => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessTokenState] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Silent re-authentication on app boot: if a refresh token survived the tab
  // close, swap it for a fresh access token without the user noticing.
  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      const storedUser = (() => {
        try {
          const raw = localStorage.getItem(STORAGE_KEYS.USER);
          return raw ? (JSON.parse(raw) as AuthUser) : null;
        } catch { return null; }
      })();
      const storedOrgId = localStorage.getItem(STORAGE_KEYS.ORG_ID);

      if (storedUser) setUser(storedUser);
      if (storedOrgId) setOrgId(storedOrgId);

      if (tokenStore.getRefreshToken()) {
        const newAt = await doRefresh();
        if (cancelled) return;
        if (newAt) {
          setAccessTokenState(newAt);
          // /auth/refresh returns a fresh user record — re-hydrate from localStorage
          try {
            const raw = localStorage.getItem(STORAGE_KEYS.USER);
            if (raw) setUser(JSON.parse(raw));
          } catch { /* ignore */ }
        } else {
          // RT was invalid/expired — full reset
          tokenStore.clear();
          setUser(null);
          setOrgId(null);
        }
      }
      if (!cancelled) setIsLoading(false);
    };

    bootstrap();
    return () => { cancelled = true; };
  }, []);

  // Keep React state in sync with the in-memory access token (changes from
  // 401 interceptor refreshes, logout from another path, etc.)
  useEffect(() => {
    const unsubscribe = tokenStore.subscribe(() => {
      setAccessTokenState(tokenStore.getAccessToken());
      if (!tokenStore.getAccessToken() && !tokenStore.getRefreshToken()) {
        setUser(null);
        setOrgId(null);
      }
    });
    return unsubscribe;
  }, []);

  // Cross-tab sync: when another tab logs in or logs out, the refresh_token
  // entry in localStorage changes. Re-bootstrap to pick up the new state.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.storageArea !== localStorage) return;
      if (e.key !== RT_STORAGE_KEY && e.key !== STORAGE_KEYS.USER && e.key !== null) return;

      const rt = tokenStore.getRefreshToken();
      if (!rt) {
        // Another tab logged out
        tokenStore.clear();
        setUser(null);
        setOrgId(null);
        setAccessTokenState(null);
        return;
      }
      // Another tab logged in (or rotated the RT) — silent refresh in this tab too.
      (async () => {
        const newAt = await doRefresh();
        if (newAt) {
          setAccessTokenState(newAt);
          try {
            const raw = localStorage.getItem(STORAGE_KEYS.USER);
            if (raw) setUser(JSON.parse(raw));
          } catch { /* ignore */ }
          const oid = localStorage.getItem(STORAGE_KEYS.ORG_ID);
          setOrgId(oid);
        }
      })();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const login = useCallback(async (username: string, password: string, orgIdParam?: string) => {
    setIsLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (orgIdParam) headers['X-Org-Id'] = orgIdParam;

      const response = await apiClient.post<LoginApiResponse>(
        '/auth/login',
        { username, password },
        { headers }
      );

      if (!response.success || !response.data) throw new Error(response.message || 'Login failed');

      const { accessToken: at, refreshToken: rt, accessTokenExpiresInSeconds, user: userData, orgId: returnedOrgId } = response.data;

      const authUser: AuthUser = {
        id: userData.id,
        username: userData.username,
        email: userData.email,
        role: userData.role,
      };

      tokenStore.setAccessToken(at, accessTokenExpiresInSeconds);
      tokenStore.setRefreshToken(rt);
      setAccessTokenState(at);
      setUser(authUser);

      const resolvedOrgId = returnedOrgId || orgIdParam || null;
      setOrgId(resolvedOrgId);

      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(authUser));
      if (resolvedOrgId) localStorage.setItem(STORAGE_KEYS.ORG_ID, resolvedOrgId);

      return { user: authUser, orgId: resolvedOrgId };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (username: string, email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await apiClient.post('/auth/register', { username, email, password });
      if (!response.success) throw new Error(response.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    const rt = tokenStore.getRefreshToken();
    // Fire-and-forget server revocation — we don't block UX on it.
    if (rt) {
      try {
        await apiClient.post('/auth/logout', { refreshToken: rt });
      } catch { /* server unreachable shouldn't trap user in logged-in state */ }
    }
    tokenStore.clear();
    setUser(null);
    setAccessTokenState(null);
    setOrgId(null);
  }, []);

  const setOrgContext = useCallback((newOrgId: string) => {
    setOrgId(newOrgId);
    localStorage.setItem(STORAGE_KEYS.ORG_ID, newOrgId);
  }, []);

  return {
    user,
    token: accessToken,
    isLoading,
    isAuthenticated: !!accessToken && !!user,
    orgId,
    login,
    register,
    logout,
    setOrgContext,
  };
};
