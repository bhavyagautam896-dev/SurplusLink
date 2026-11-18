import axios, { AxiosError } from 'axios';

const rawBase = (import.meta as any).env?.VITE_API_URL || '/api';
const normalizedBase = (() => {
  let url = String(rawBase).trim();
  if (url.endsWith('/')) url = url.slice(0, -1);
  if (url.startsWith('http') && !url.endsWith('/api')) {
    url = `${url}/api`;
  }
  return url;
})();

export const api = axios.create({
  baseURL: normalizedBase,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach Authorization header if token exists in localStorage (as fallback to cookies)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('surpluslink_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Format API error messages
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (data && typeof data === 'object') {
      if ('error' in data && typeof data.error === 'string') {
        return data.error;
      }
      if ('message' in data && typeof data.message === 'string') {
        return data.message;
      }
    }
    return error.message || 'Network communication error';
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
}

