import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import apiClient, { storeTokens, clearTokens, getAccessToken, getRefreshToken } from './api-client';

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
      const token = await getAccessToken();
      if (!token) {
        setIsLoading(false);
        return;
      }

      const refreshToken = await getRefreshToken();
      if (refreshToken) {
        try {
          const response = await apiClient.post('/api/auth/refresh', {
            refreshToken,
          });
          const { accessToken, refreshToken: newRefresh } = response.data;
          await storeTokens(accessToken, newRefresh || refreshToken);
          setIsAuthenticated(true);
          if (response.data.user) {
            setUser(response.data.user);
          }
        } catch {
          await clearTokens();
          setIsAuthenticated(false);
        }
      }
    } catch {
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }

  async function login(email: string, password: string) {
    const response = await apiClient.post('/api/auth/token-login', {
      email: email.toLowerCase(),
      password,
    });

    const { accessToken, refreshToken, user: userData } = response.data;
    await storeTokens(accessToken, refreshToken);
    setUser(userData || null);
    setIsAuthenticated(true);
  }

  async function logout() {
    await clearTokens();
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
