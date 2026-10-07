import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as authService from '../services/auth.service';
import { setSessionExpiredHandler, toApiError } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restores the session on page refresh using the httpOnly cookie.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await authService.me();
        if (active) setUser(response.data.user);
      } catch {
        if (active) setUser(null);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    setSessionExpiredHandler(() => setUser(null));
  }, []);

  const login = useCallback(async (credentials) => {
    const response = await authService.login(credentials);
    setUser(response.data.user);
    return response.data.user;
  }, []);

  const register = useCallback(async (payload) => {
    const response = await authService.register(payload);
    setUser(response.data.user);
    return response.data.user;
  }, []);

  const logout = useCallback(async () => {
    try { await authService.logout(); } catch { /* cookie already gone */ }
    setUser(null);
  }, []);

  const logoutEverywhere = useCallback(async () => {
    await authService.logoutAll();
    setUser(null);
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    isAuthenticated: Boolean(user),
    login,
    register,
    logout,
    logoutEverywhere,
    updateUser: (next) => setUser(next),
  }), [user, loading, login, register, logout, logoutEverywhere]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
};

export { toApiError };
