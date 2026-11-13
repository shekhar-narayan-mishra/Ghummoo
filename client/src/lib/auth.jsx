import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try { setUser(await api.get('/auth/me')); } catch { setUser(null); } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    let ignore = false;
    api.get('/auth/me')
      .then((u) => { if (!ignore) setUser(u); })
      .catch(() => { if (!ignore) setUser(null); })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    refresh,
    login: async (email, password) => { const u = await api.post('/auth/login', { email, password }); setUser(u); return u; },
    register: async (data) => { const u = await api.post('/auth/register', data); setUser(u); return u; },
    logout: async () => { try { await api.post('/auth/logout'); } finally { setUser(null); } },
  }), [user, loading, refresh]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

// eslint-disable-next-line react-refresh/only-export-components
export { homeFor } from './authHelpers';
