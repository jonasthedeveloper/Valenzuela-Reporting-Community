import axios from 'axios';

const API_ORIGIN = import.meta.env.VITE_API_ORIGIN || 'http://localhost:5050';

/**
 * The .env default points at http://localhost:5050 — correct when the page is
 * opened at localhost, but wrong when the app is reached some other way:
 *   • http://127.0.0.1:5173  → cookies are cross-site between 127.0.0.1 and
 *     localhost, so the session cookie never arrives (401 loop);
 *   • a LAN IP / phone (PWA test on the same Wi-Fi) → "localhost" would mean
 *     the phone itself, and every request fails with
 *     "Cannot reach the server … Check that the backend is running."
 * Whenever the configured API host is a loopback address, point it at whatever
 * host the page was opened from instead — the backend listens on 0.0.0.0, so
 * the same machine answers there, and site-boundary cookies keep working.
 */
const resolveHost = (rawUrl) => {
  try {
    const url = new URL(rawUrl);
    const pageHost = window.location.hostname;
    const apiIsLoopback = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    if (pageHost && apiIsLoopback && url.hostname !== pageHost) url.hostname = pageHost;
    return url.toString().replace(/\/$/, '');
  } catch {
    return rawUrl;
  }
};

const BASE_URL = resolveHost(import.meta.env.VITE_API_URL || `${API_ORIGIN}/api`);
const BASE_ORIGIN = resolveHost(API_ORIGIN);

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: { Accept: 'application/json' },
});

/** Absolute origin of the API (uploads, media) — follows the same host rule. */
export const apiOrigin = BASE_ORIGIN;

/** Normalised error shape: { message, errors, status } */
export const toApiError = (error) => {
  if (error?.response?.data) {
    const { message, errors } = error.response.data;
    return {
      message: message || 'Something went wrong. Try again.',
      errors: errors || null,
      status: error.response.status,
    };
  }
  if (error?.code === 'ERR_NETWORK') {
    return {
      message: `Cannot reach the server at ${api.defaults.baseURL}. Check that the backend is running.`,
      errors: null,
      status: 0,
    };
  }
  return { message: error?.message || 'Something went wrong.', errors: null, status: 0 };
};

let refreshPromise = null;
let onSessionExpired = null;

export const setSessionExpiredHandler = (handler) => { onSessionExpired = handler; };

const AUTH_FREE = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/forgot-password', '/auth/reset-password'];

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const url = original?.url || '';

    if (status === 401 && !original?._retried && !AUTH_FREE.some((path) => url.includes(path))) {
      original._retried = true;
      try {
        refreshPromise = refreshPromise || api.post('/auth/refresh');
        await refreshPromise;
        refreshPromise = null;
        return api(original);
      } catch (refreshError) {
        refreshPromise = null;
        if (onSessionExpired) onSessionExpired();
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
