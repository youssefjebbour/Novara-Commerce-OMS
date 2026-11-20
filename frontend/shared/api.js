import axios from 'axios';

const key = 'novara-session';
export function readSession() {
  try {
    return JSON.parse(sessionStorage.getItem(key) || 'null');
  } catch {
    return null;
  }
}
export function saveSession(value) {
  if (value) sessionStorage.setItem(key, JSON.stringify(value));
  else sessionStorage.removeItem(key);
  window.dispatchEvent(new Event('novara-auth'));
}
export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api', timeout: 20000 });
api.interceptors.request.use((config) => {
  const token = readSession()?.accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
let refreshing;
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const config = error.config;
    if (
      error.response?.status === 401 &&
      !config?._retried &&
      !config?.url?.startsWith('/auth/') &&
      readSession()?.refreshToken
    ) {
      config._retried = true;
      if (!refreshing)
        refreshing = axios
          .post(`${api.defaults.baseURL}/auth/refresh`, { refreshToken: readSession().refreshToken })
          .then((r) => {
            saveSession(r.data);
            return r.data;
          })
          .catch((e) => {
            saveSession(null);
            throw e;
          })
          .finally(() => {
            refreshing = null;
          });
      return refreshing.then(() => api(config));
    }
    return Promise.reject(error);
  },
);
export function errorMessage(error) {
  const data = error?.response?.data;
  if (data?.fields && Object.keys(data.fields).length)
    return Object.entries(data.fields)
      .map(([k, v]) => `${k}: ${v}`)
      .join(' · ');
  return data?.message || error?.message || 'Something went wrong. Please try again.';
}
export const money = (value) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value || 0));
export const date = (value) =>
  value
    ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(
        new Date(value),
      )
    : '—';
export const dateTime = (value) =>
  value
    ? new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }).format(new Date(value))
    : '—';
export const label = (value) =>
  (value || '')
    .toLowerCase()
    .replaceAll('_', ' ')
    .replace(/^./, (c) => c.toUpperCase());
export const media = (path) =>
  path?.startsWith('/media/') && import.meta.env.VITE_API_URL
    ? `${new URL(import.meta.env.VITE_API_URL).origin}${path}`
    : path;
