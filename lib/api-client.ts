import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const BASE_URL = 'https://mealplanai.replit.app';

const SESSION_KEY = 'perform_session';

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

export async function getSessionFlag(): Promise<string | null> {
  return SecureStore.getItemAsync(SESSION_KEY);
}

export async function setSessionFlag(value: string): Promise<void> {
  await SecureStore.setItemAsync(SESSION_KEY, value);
}

export async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync(SESSION_KEY);
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await clearSession();
    }
    return Promise.reject(error);
  }
);

export default apiClient;
