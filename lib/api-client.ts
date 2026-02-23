import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export const API_BASE_URL = 'https://mealplanai.replit.app';

function getEffectiveBaseUrl(): string {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
      return `${window.location.protocol}//${window.location.hostname}:5000`;
    }
    return 'http://localhost:5000';
  }
  return API_BASE_URL;
}

const EFFECTIVE_BASE_URL = getEffectiveBaseUrl();
console.log("FINAL API_BASE_URL =>", API_BASE_URL);
console.log("EFFECTIVE_BASE_URL =>", EFFECTIVE_BASE_URL);

const apiClient = axios.create({
  baseURL: EFFECTIVE_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

const TOKEN_KEY = 'perform_access_token';
const REFRESH_KEY = 'perform_refresh_token';

async function secureGet(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    }
  }
  return SecureStore.getItemAsync(key);
}

async function secureSet(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
    }
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function secureDelete(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
    }
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export async function getAccessToken(): Promise<string | null> {
  return secureGet(TOKEN_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return secureGet(REFRESH_KEY);
}

export async function storeTokens(accessToken: string, refreshToken: string): Promise<void> {
  await secureSet(TOKEN_KEY, accessToken);
  await secureSet(REFRESH_KEY, refreshToken);
}

export async function clearTokens(): Promise<void> {
  await secureDelete(TOKEN_KEY);
  await secureDelete(REFRESH_KEY);
}

let isRefreshing = false;
let onRefreshComplete: ((token: string | null) => void)[] = [];

apiClient.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          onRefreshComplete.push((token) => {
            if (token) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(apiClient(originalRequest));
            } else {
              reject(error);
            }
          });
        });
      }

      isRefreshing = true;

      try {
        const refreshToken = await getRefreshToken();
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        const response = await axios.post(`${EFFECTIVE_BASE_URL}/api/auth/refresh`, {
          refreshToken,
        });

        const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data;
        await storeTokens(newAccessToken, newRefreshToken || refreshToken);

        onRefreshComplete.forEach((cb) => cb(newAccessToken));
        onRefreshComplete = [];
        isRefreshing = false;

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        onRefreshComplete.forEach((cb) => cb(null));
        onRefreshComplete = [];
        isRefreshing = false;
        await clearTokens();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
