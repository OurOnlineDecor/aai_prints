/**
 * ─────────────────────────────────────────────────────────────
 * Aai Prints — Centralized API Client & Network Service
 * ─────────────────────────────────────────────────────────────
 * Dual-layer authentication:
 *  - Automated credentials: 'include' for httpOnly cookie management
 *  - Persistent Bearer token injection from localStorage (resilient to browser restart & 3rd-party cookie blocks)
 *  - Automatic Silent Token Refresh with rotation & subscriber queueing
 *  - Unified error handling & JSON parsing
 * ─────────────────────────────────────────────────────────────
 */

export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

export const TOKEN_STORAGE_KEYS = {
  ACCESS_TOKEN: 'aaiprints_accessToken',
  REFRESH_TOKEN: 'aaiprints_refreshToken',
  USER: 'aaiprints_user',
};

export const getStoredAccessToken = () => {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEYS.ACCESS_TOKEN) || null;
  } catch {
    return null;
  }
};

export const setStoredAccessToken = (token) => {
  try {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEYS.ACCESS_TOKEN, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEYS.ACCESS_TOKEN);
    }
  } catch (e) {
    console.warn('[apiClient] Failed saving access token to localStorage:', e);
  }
};

export const getStoredRefreshToken = () => {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEYS.REFRESH_TOKEN) || null;
  } catch {
    return null;
  }
};

export const setStoredRefreshToken = (token) => {
  try {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEYS.REFRESH_TOKEN, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEYS.REFRESH_TOKEN);
    }
  } catch (e) {
    console.warn('[apiClient] Failed saving refresh token to localStorage:', e);
  }
};

export const clearStoredAuth = () => {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(TOKEN_STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(TOKEN_STORAGE_KEYS.USER);
  } catch (e) {
    console.warn('[apiClient] Failed clearing stored auth:', e);
  }
};

let isRefreshing = false;
let refreshSubscribers = [];

const onRefreshed = (success, newAccessToken = null) => {
  refreshSubscribers.forEach((callback) => callback(success, newAccessToken));
  refreshSubscribers = [];
};

const subscribeTokenRefresh = (callback) => {
  refreshSubscribers.push(callback);
};

export class ApiNetworkError extends Error {
  constructor(message, status, data = null) {
    super(message);
    this.name = 'ApiNetworkError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Base HTTP request execution with dual-layer token auth & automatic silent refresh
 */
export async function apiClient(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const defaultHeaders = {};
  if (!(options.body instanceof FormData)) {
    defaultHeaders['Content-Type'] = 'application/json';
  }

  // Dual-layer: Attach Bearer token from localStorage if available and not already provided
  const storedAccessToken = getStoredAccessToken();
  if (storedAccessToken && !options.headers?.Authorization) {
    defaultHeaders['Authorization'] = `Bearer ${storedAccessToken}`;
  }

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
    credentials: 'include', // Transmit and store httpOnly cookies
  };

  try {
    const response = await fetch(url, config);

    // If 401 Unauthorized occurs on protected routes (except during login/refresh) and has not already been retried
    if (
      response.status === 401 &&
      !endpoint.includes('/auth/login') &&
      !endpoint.includes('/auth/refresh-token') &&
      !options._retry
    ) {
      const errorJson = await response.json().catch(() => null);
      const storedRefreshToken = getStoredRefreshToken();

      // Check if we can attempt a silent refresh
      const shouldAttemptRefresh =
        Boolean(storedRefreshToken) ||
        errorJson?.message?.toLowerCase().includes('expired') ||
        errorJson?.message?.toLowerCase().includes('token') ||
        errorJson?.message?.toLowerCase().includes('authentication required') ||
        errorJson?.errors?.some((e) => e.code === 'TOKEN_EXPIRED');

      if (shouldAttemptRefresh) {
        if (!isRefreshing) {
          isRefreshing = true;
          try {
            const refreshRes = await fetch(`${API_BASE}/auth/refresh-token`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                refreshToken: storedRefreshToken || undefined,
              }),
            });

            if (refreshRes.ok) {
              const refreshData = await refreshRes.json().catch(() => null);
              const freshAccess = refreshData?.data?.accessToken;
              const freshRefresh = refreshData?.data?.refreshToken;

              if (freshAccess) setStoredAccessToken(freshAccess);
              if (freshRefresh) setStoredRefreshToken(freshRefresh);

              isRefreshing = false;
              onRefreshed(true, freshAccess);

              // Replay original request with fresh token
              const retryHeaders = { ...options.headers };
              if (freshAccess) {
                retryHeaders['Authorization'] = `Bearer ${freshAccess}`;
              }
              return await apiClient(endpoint, {
                ...options,
                _retry: true,
                headers: retryHeaders,
              });
            } else {
              isRefreshing = false;
              onRefreshed(false);
              clearStoredAuth();
              window.dispatchEvent(new CustomEvent('auth:session-expired'));
              throw new ApiNetworkError('Session expired. Please log in again.', 401, errorJson);
            }
          } catch (refreshErr) {
            isRefreshing = false;
            onRefreshed(false);
            clearStoredAuth();
            window.dispatchEvent(new CustomEvent('auth:session-expired'));
            throw new ApiNetworkError('Session expired. Please log in again.', 401, errorJson);
          }
        }

        // If refresh is already in progress, queue this request
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh(async (success, freshAccess) => {
            if (success) {
              try {
                const retryHeaders = { ...options.headers };
                if (freshAccess) {
                  retryHeaders['Authorization'] = `Bearer ${freshAccess}`;
                }
                const retryResponse = await apiClient(endpoint, {
                  ...options,
                  _retry: true,
                  headers: retryHeaders,
                });
                resolve(retryResponse);
              } catch (err) {
                reject(err);
              }
            } else {
              reject(new ApiNetworkError('Session expired. Please log in again.', 401, errorJson));
            }
          });
        });
      }

      throw new ApiNetworkError(
        errorJson?.message || 'Unauthorized access',
        401,
        errorJson
      );
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const errorMsg = errorData?.message || `Request failed with status ${response.status}`;
      throw new ApiNetworkError(errorMsg, response.status, errorData);
    }

    // Parse JSON response
    return await response.json();
  } catch (error) {
    if (error instanceof ApiNetworkError) {
      throw error;
    }
    throw new ApiNetworkError(error.message || 'Network error occurred', 0, null);
  }
}

export const api = {
  get: (endpoint, options = {}) => apiClient(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options = {}) =>
    apiClient(endpoint, {
      ...options,
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  put: (endpoint, body, options = {}) =>
    apiClient(endpoint, {
      ...options,
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  delete: (endpoint, options = {}) => apiClient(endpoint, { ...options, method: 'DELETE' }),
};

export default api;
