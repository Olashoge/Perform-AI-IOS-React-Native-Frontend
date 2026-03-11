import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient, { storeTokens, clearTokens, getAccessToken, getRefreshToken } from './api-client';

export interface AuthUser {
  id?: string;
  firstName?: string;
  email?: string;
  provider?: string;
  name?: string;
}

interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  needsOnboarding: boolean;
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (firstName: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  completeOnboarding: () => void;
  refreshUser: () => Promise<void>;
  updateUser: (updates: Partial<AuthUser>) => void;
}

const ONBOARDING_KEY = 'perform_onboarding_complete';

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchProfileOnboardingStatus(): Promise<boolean> {
  try {
    const response = await apiClient.get('/api/profile');
    const p = response.data;
    const hasProfile = !!(p && (p.primaryGoal || p.age || p.weightKg || p.trainingExperience));
    return !hasProfile;
  } catch {
    return true;
  }
}

function parseUserFromResponse(userData: any, fallbackEmail?: string): AuthUser {
  return {
    id: userData?.id || userData?._id || undefined,
    firstName: userData?.firstName || userData?.first_name || undefined,
    email: userData?.email || fallbackEmail || undefined,
    provider: userData?.provider || undefined,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

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
          let email = userData.email;
          if (!email && accessToken) {
            try {
              const payload = JSON.parse(atob(accessToken.split('.')[1]));
              if (payload.email) email = payload.email;
            } catch {}
          }
          setUser(parseUserFromResponse(userData, email));

          try {
            const meRes = await apiClient.get('/api/me');
            if (meRes.data) {
              setUser(parseUserFromResponse(meRes.data, email));
            }
          } catch {}

          const cached = await AsyncStorage.getItem(ONBOARDING_KEY);
          if (cached === 'true') {
            setNeedsOnboarding(false);
          } else {
            const needs = await fetchProfileOnboardingStatus();
            setNeedsOnboarding(needs);
            if (!needs) {
              await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
            }
          }
        } catch {
          await clearTokens();
          setIsAuthenticated(false);
        }
      } else {
        setIsAuthenticated(true);
        let email: string | undefined;
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          if (payload.email) email = payload.email;
        } catch {}
        setUser(email ? { email } : null);

        const cached = await AsyncStorage.getItem(ONBOARDING_KEY);
        if (cached === 'true') {
          setNeedsOnboarding(false);
        } else {
          const needs = await fetchProfileOnboardingStatus();
          setNeedsOnboarding(needs);
          if (!needs) {
            await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
          }
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
    setUser(parseUserFromResponse(userData, email.toLowerCase()));
    setIsAuthenticated(true);

    const cached = await AsyncStorage.getItem(ONBOARDING_KEY);
    if (cached === 'true') {
      setNeedsOnboarding(false);
    } else {
      const needs = await fetchProfileOnboardingStatus();
      setNeedsOnboarding(needs);
      if (!needs) {
        await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
      }
    }
  }

  async function signup(firstName: string, email: string, password: string) {
    try {
      await apiClient.post('/api/auth/signup', {
        firstName,
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
    await AsyncStorage.removeItem(ONBOARDING_KEY);
    setUser(null);
    setIsAuthenticated(false);
    setNeedsOnboarding(false);
  }

  const refreshUser = useCallback(async () => {
    try {
      const response = await apiClient.get('/api/me');
      if (response.data) {
        setUser(prev => ({
          ...(prev || {}),
          ...parseUserFromResponse(response.data, prev?.email),
        }));
      }
    } catch {}
  }, []);

  const updateUser = useCallback((updates: Partial<AuthUser>) => {
    setUser(prev => prev ? { ...prev, ...updates } : updates);
  }, []);

  const completeOnboarding = useCallback(() => {
    setNeedsOnboarding(false);
    AsyncStorage.setItem(ONBOARDING_KEY, 'true');
  }, []);

  const value = useMemo(
    () => ({
      isAuthenticated,
      isLoading,
      needsOnboarding,
      user,
      login,
      signup,
      logout,
      completeOnboarding,
      refreshUser,
      updateUser,
    }),
    [isAuthenticated, isLoading, needsOnboarding, user, completeOnboarding, refreshUser, updateUser]
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
