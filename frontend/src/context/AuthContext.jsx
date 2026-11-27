import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  api,
  TOKEN_STORAGE_KEYS,
  getStoredAccessToken,
  setStoredAccessToken,
  getStoredRefreshToken,
  setStoredRefreshToken,
  clearStoredAuth,
} from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Synchronously initialize user from localStorage so there's zero flash of unauthenticated state
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem(TOKEN_STORAGE_KEYS.USER);
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.warn('[AuthContext] Failed to parse stored user from localStorage:', e);
      return null;
    }
  });

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    try {
      const savedUser = localStorage.getItem(TOKEN_STORAGE_KEYS.USER);
      const hasToken =
        Boolean(getStoredAccessToken()) || Boolean(getStoredRefreshToken());
      return Boolean(savedUser && hasToken);
    } catch {
      return false;
    }
  });

  // Since we synchronously initialize state, initial loading only blocks if there's no cached state
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState(null);

  // Helper to persist session to state and localStorage
  const applySession = (userData, accessToken = null, refreshToken = null) => {
    setUser(userData);
    setIsAuthenticated(true);
    setAuthError(null);

    try {
      if (userData) {
        localStorage.setItem(TOKEN_STORAGE_KEYS.USER, JSON.stringify(userData));
      }
      if (accessToken) {
        setStoredAccessToken(accessToken);
      }
      if (refreshToken) {
        setStoredRefreshToken(refreshToken);
      }
    } catch (e) {
      console.warn('[AuthContext] Error persisting session to localStorage:', e);
    }
  };

  // Helper to purge session
  const purgeSession = () => {
    setUser(null);
    setIsAuthenticated(false);
    clearStoredAuth();
  };

  // Verify and sync current session on mount via /auth/me
  const checkAuth = useCallback(async () => {
    const hasStoredSession =
      Boolean(getStoredAccessToken()) ||
      Boolean(getStoredRefreshToken()) ||
      Boolean(localStorage.getItem(TOKEN_STORAGE_KEYS.USER));

    try {
      // If no stored credentials exist at all, we are simply a guest
      if (!hasStoredSession) {
        setUser(null);
        setIsAuthenticated(false);
        return;
      }

      const res = await api.get('/auth/me');
      if (res?.data?.user) {
        applySession(res.data.user);
      } else {
        // Only purge if server explicitly returned an empty payload
        purgeSession();
      }
    } catch (err) {
      // If 401 occurred and silent refresh failed, server rejected the session
      if (err?.status === 401) {
        console.warn('[AuthContext] Session expired on server:', err.message);
        purgeSession();
      } else {
        // Network error / server warming up: preserve cached user so offline or wake-up doesn't kick user out
        console.warn('[AuthContext] Background session verification notice (offline/warmup):', err.message);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();

    // Listen for session expiration events from API client (when refresh token fails)
    const handleSessionExpired = () => {
      console.warn('[AuthContext] Session expired event received from API client.');
      purgeSession();
    };

    window.addEventListener('auth:session-expired', handleSessionExpired);
    return () => window.removeEventListener('auth:session-expired', handleSessionExpired);
  }, [checkAuth]);

  // Login handler
  const login = async ({ email, password }) => {
    try {
      setAuthError(null);
      const res = await api.post('/auth/login', { email, password });
      const userData = res?.data?.user;
      const accessToken = res?.data?.accessToken;
      const refreshToken = res?.data?.refreshToken;

      if (userData) {
        applySession(userData, accessToken, refreshToken);
        return userData;
      }
      throw new Error('Invalid login response from server');
    } catch (err) {
      setAuthError(err.message || 'Login failed');
      throw err;
    }
  };

  // Registration handler
  const register = async ({ name, email, password, phone }) => {
    try {
      setAuthError(null);
      const res = await api.post('/auth/register', { name, email, password, phone });
      const userData = res?.data?.user;
      const accessToken = res?.data?.accessToken;
      const refreshToken = res?.data?.refreshToken;

      if (userData) {
        applySession(userData, accessToken, refreshToken);
        return userData;
      }
      throw new Error('Invalid registration response');
    } catch (err) {
      setAuthError(err.message || 'Registration failed');
      throw err;
    }
  };

  // Google Sign-In handler (receives ID token credential from GIS)
  const loginWithGoogle = async (credential) => {
    try {
      setAuthError(null);
      const res = await api.post('/auth/google', { credential });
      const userData = res?.data?.user;
      const accessToken = res?.data?.accessToken;
      const refreshToken = res?.data?.refreshToken;

      if (userData) {
        applySession(userData, accessToken, refreshToken);
        return userData;
      }
      throw new Error('Invalid response from Google authentication');
    } catch (err) {
      const detailedMsg =
        err.data?.message || err.message || 'Google sign-in failed. Please try again.';
      setAuthError(detailedMsg);
      throw err;
    }
  };

  // Logout handler
  const logout = async () => {
    try {
      const currentRefreshToken = getStoredRefreshToken();
      await api.post('/auth/logout', { refreshToken: currentRefreshToken || undefined });
    } catch (err) {
      console.warn('[AuthContext] Logout call failed on server:', err.message);
    } finally {
      purgeSession();
    }
  };

  // Add delivery address
  const addAddress = async (addressData) => {
    try {
      const res = await api.post('/auth/addresses', addressData);
      if (res?.data?.addresses && user) {
        const updatedUser = { ...user, addresses: res.data.addresses };
        applySession(updatedUser);
      }
      return res?.data?.addresses;
    } catch (err) {
      throw err;
    }
  };

  // Update delivery address
  const updateAddress = async (addressId, addressData) => {
    try {
      const res = await api.put(`/auth/addresses/${addressId}`, addressData);
      if (res?.data?.addresses && user) {
        const updatedUser = { ...user, addresses: res.data.addresses };
        applySession(updatedUser);
      }
      return res?.data?.addresses;
    } catch (err) {
      throw err;
    }
  };

  // Delete delivery address
  const deleteAddress = async (addressId) => {
    try {
      const res = await api.delete(`/auth/addresses/${addressId}`);
      if (res?.data?.addresses && user) {
        const updatedUser = { ...user, addresses: res.data.addresses };
        applySession(updatedUser);
      }
      return res?.data?.addresses;
    } catch (err) {
      throw err;
    }
  };

  const value = {
    user,
    isAuthenticated,
    isLoading,
    authError,
    login,
    register,
    loginWithGoogle,
    logout,
    checkAuth,
    addAddress,
    updateAddress,
    deleteAddress,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
