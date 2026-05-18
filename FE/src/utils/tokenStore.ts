// Module-singleton holding the access token in memory only (XSS-resistant: a
// stolen-via-XSS payload can't read it from localStorage). The refresh token
// stays in localStorage so we can survive a tab close — that's the explicit
// trade-off in the AT/RT model.

const RT_KEY = 'refresh_token';

type Listener = () => void;

let accessToken: string | null = null;
let accessTokenExpiresAt: number | null = null; // epoch ms
const listeners = new Set<Listener>();

export const tokenStore = {
  getAccessToken: () => accessToken,
  getAccessTokenExpiresAt: () => accessTokenExpiresAt,
  hasAccessToken: () => !!accessToken && (accessTokenExpiresAt ?? 0) > Date.now(),

  setAccessToken: (token: string | null, expiresInSeconds?: number) => {
    accessToken = token;
    accessTokenExpiresAt = token && expiresInSeconds
      ? Date.now() + expiresInSeconds * 1000
      : null;
    listeners.forEach((l) => l());
  },

  getRefreshToken: (): string | null => {
    try { return localStorage.getItem(RT_KEY); } catch { return null; }
  },
  setRefreshToken: (rt: string | null) => {
    try {
      if (rt) localStorage.setItem(RT_KEY, rt);
      else localStorage.removeItem(RT_KEY);
    } catch { /* private mode / quota — best effort */ }
  },

  clear: () => {
    accessToken = null;
    accessTokenExpiresAt = null;
    try {
      localStorage.removeItem(RT_KEY);
      localStorage.removeItem('auth_user');
      localStorage.removeItem('org_id');
      localStorage.removeItem('org_slug');
      localStorage.removeItem('current_org');
    } catch { /* ignore */ }
    listeners.forEach((l) => l());
  },

  subscribe: (listener: Listener) => {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  },
};

export const RT_STORAGE_KEY = RT_KEY;
