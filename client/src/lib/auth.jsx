import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, resetCsrf } from './api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { user: current } = await api('/auth/me');
      setUser(current);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const login = async (email, password) => {
    const { user: logged } = await api('/auth/login', { method: 'POST', body: { email, password } });
    resetCsrf();
    setUser(logged);
    return logged;
  };

  const register = async (payload) => {
    const { user: created } = await api('/auth/register', { method: 'POST', body: payload });
    resetCsrf();
    setUser(created);
    return created;
  };

  const logout = async () => {
    await api('/auth/logout', { method: 'POST' });
    resetCsrf();
    setUser(null);
  };

  const value = useMemo(
    () => ({
      user, loading, login, register, logout, refresh,
      isAdmin: ['ADMIN', 'OWNER'].includes(user?.role),
      isOwner: user?.role === 'OWNER',
    }),
    [user, loading, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
