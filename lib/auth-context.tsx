import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import apiClient, { storeTokens, clearTokens, getAccessToken, getRefreshToken } from './api-client';

interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: any | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
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
          const userData = response.data.user || {};
          if (!userData.email && accessToken) {
            try {
              const payload = JSON.parse(atob(accessToken.split('.')[1]));
              if (payload.email) userData.email = payload.email;
            } catch {}
          }
          setUser(Object.keys(userData).length > 0 ? userData : null);
        } catch {
          await clearTokens();
          setIsAuthenticated(false);
        }
      } else {
        setIsAuthenticated(true);
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          if (payload.email) setUser({ email: payload.email });
        } catch {}
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
    setUser({ ...(userData || {}), email: userData?.email || email.toLowerCase() });
    setIsAuthenticated(true);
  }

  async function signup(name: string, email: string, password: string) {
    try {
      await apiClient.post('/api/auth/signup', {
        name,
        email: email.toLowerCase(),
        password,
      });
    } catch (signupErr: any) {
      const status = signupErr.response?.status;
      const msg = signupErr.response?.data?.message || signupErr.response?.data?.error || '';
      if (status === 409 || /already|exists|duplicate|registered/i.test(msg)) {
        throw new Error('An account with this email already exists. Try signing in.');
      }
      throw signupErr;
    }
    await login(email, password);
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
      signup,
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
