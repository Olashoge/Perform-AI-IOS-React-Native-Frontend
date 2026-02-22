import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import apiClient, { setSessionFlag, clearSession, getSessionFlag } from './api-client';

interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: any | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const session = await getSessionFlag();
      if (!session) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await apiClient.get('/api/auth/me');
        if (response.data && response.data.user) {
          setUser(response.data.user);
          setIsAuthenticated(true);
        } else if (response.data) {
          setUser(response.data);
          setIsAuthenticated(true);
        } else {
          await clearSession();
        }
      } catch {
        await clearSession();
        setIsAuthenticated(false);
      }
    } catch {
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }

  async function login(email: string, password: string) {
    const url = '/api/auth/login';
    console.log('[Auth] Login request URL:', apiClient.defaults.baseURL + url);
    console.log('[Auth] Login payload:', JSON.stringify({ email, password: '***' }));

    try {
      const response = await apiClient.post(url, { email, password });

      console.log('[Auth] Login response status:', response.status);
      console.log('[Auth] Login response data:', JSON.stringify(response.data));

      await setSessionFlag('active');

      if (response.data?.user) {
        setUser(response.data.user);
      } else if (response.data) {
        setUser(response.data);
      }

      setIsAuthenticated(true);
    } catch (err: any) {
      console.log('[Auth] Login error status:', err.response?.status);
      console.log('[Auth] Login error data:', JSON.stringify(err.response?.data));
      console.log('[Auth] Login error message:', err.message);
      throw err;
    }
  }

  async function logout() {
    try {
      await apiClient.post('/api/auth/logout');
    } catch {
    }
    await clearSession();
    setUser(null);
    setIsAuthenticated(false);
  }

  const value = useMemo(
    () => ({
      isAuthenticated,
      isLoading,
      user,
      login,
      logout,
    }),
    [isAuthenticated, isLoading, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
