import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { useAuth as useClerkAuth, useClerk } from '@clerk/react';
import { API_BASE_URL } from '../config';

// All axios requests send credentials with requests
axios.defaults.withCredentials = true;

const AuthContext = createContext(null);

// Hint in localStorage (browser-only) that user was previously signed in
const SIGNED_IN_HINT = 'lasca_signed_in';
export function wasSignedIn() {
  try { return localStorage.getItem(SIGNED_IN_HINT) === '1'; } catch { return false; }
}
function rememberSignedIn(on) {
  try { if (on) localStorage.setItem(SIGNED_IN_HINT, '1'); else localStorage.removeItem(SIGNED_IN_HINT); } catch { /* private browsing */ }
}

export function AuthProvider({ children }) {
  const { isLoaded, isSignedIn, userId, sessionId, getToken: clerkGetToken } = useClerkAuth();
  const { signOut } = useClerk();
  // Το getToken του Clerk αλλάζει ταυτότητα σε κάθε render· το κρατάμε σε ref ώστε να μην ξαναπυροδοτεί effects.
  const getTokenRef = useRef(clerkGetToken);
  useEffect(() => { getTokenRef.current = clerkGetToken; });
  const getToken = useCallback((...args) => getTokenRef.current(...args), []);
  const [user, setUser] = useState(null);
  const [needsTermsAcceptance, setNeedsTermsAcceptance] = useState(false);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState({});

  const logout = useCallback(async () => {
    try {
      await signOut({ redirectUrl: '/login' });
    } finally {
      setUser(null);
      setNeedsTermsAcceptance(false);
    }
  }, [signOut]);

  // Fetch user data from backend using Clerk token
  const refresh = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) {
        setUser(null);
        setNeedsTermsAcceptance(false);
        return null;
      }
      const { data } = await axios.get(`${API_BASE_URL}/api/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser(data || null);
      setNeedsTermsAcceptance(false);
      return data || null;
    } catch (error) {
      if (error.response?.status === 409) {
        setNeedsTermsAcceptance(true);
        return null;
      }
      setUser(null);
      setNeedsTermsAcceptance(false);
      return null;
    }
  }, [getToken]);

  // Accept Terms of Use
  const acceptTerms = useCallback(async () => {
    const token = await getToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const { data } = await axios.post(`${API_BASE_URL}/api/me/accept-terms`, { accept: true }, { headers });
    setUser(data);
    setNeedsTermsAcceptance(false);
    return data;
  }, [getToken]);

  useEffect(() => {
    if (!loading) rememberSignedIn(Boolean(user) || needsTermsAcceptance);
  }, [user, loading, needsTermsAcceptance]);

  // STRICT state logic: no recursive loops
  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      setUser(null);
      setNeedsTermsAcceptance(false);
      setLoading(false);
      return;
    }

    let alive = true;
    setLoading(true);
    (async () => {
      try {
        const token = await getTokenRef.current();
        if (!token) {
          if (alive) {
            setUser(null);
            setNeedsTermsAcceptance(false);
          }
          return;
        }
        const { data } = await axios.get(`${API_BASE_URL}/api/me`, {
          headers: { Authorization: 'Bearer ' + token },
        });
        if (alive) {
          setUser(data || null);
          setNeedsTermsAcceptance(false);
        }
      } catch (error) {
        if (alive && error.response?.status === 409) {
          setNeedsTermsAcceptance(true);
        } else if (alive) {
          setUser(null);
          setNeedsTermsAcceptance(false);
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; };
    // Avoid refetching when Clerk recreates getToken; only auth/session identity changes trigger this check.
  }, [isLoaded, isSignedIn, userId, sessionId]);

  // Το config φορτώνεται μία φορά στο mount
  useEffect(() => {
    axios.get(`${API_BASE_URL}/api/auth/config`)
      .then(({ data }) => setConfig(data || {}))
      .catch(() => {});
  }, []);

  // Handle 401 responses from API
  useEffect(() => {
    const id = axios.interceptors.response.use(
      (res) => res,
      (error) => {
        if (error.response?.status === 403 || error.response?.status === 409) {
          return Promise.reject(error);
        }
        const url = error.config?.url || '';
        const isAuthCall = /\/api\/(me|auth\/)/.test(url);
        if (error.response?.status === 401 && !isAuthCall) setUser(null);
        return Promise.reject(error);
      }
    );
    return () => axios.interceptors.response.eject(id);
  }, []);

  // Set up axios interceptor to attach Clerk token to all requests
  useEffect(() => {
    const id = axios.interceptors.request.use(
      async (config) => {
        if (isSignedIn) {
          const token = await getToken();
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        }
        return config;
      },
      (error) => Promise.reject(error)
    );
    return () => axios.interceptors.request.eject(id);
  }, [isSignedIn, getToken]);

  const value = useMemo(() => ({
    user,
    setUser,
    needsTermsAcceptance,
    loading,
    logout,
    refresh,
    acceptTerms,
    config,
    googleClientId: config.google_client_id || null,
    captchaSiteKey: config.captcha_site_key || null,
    passwordMin: config.password_min || 8,
    passwordRecommended: config.password_recommended || 12,
    minAge: config.min_age || 15,
    emailVerificationRequired: Boolean(config.email_verification_required),
  }), [user, needsTermsAcceptance, loading, logout, refresh, acceptTerms, config]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}

// Error message from backend response or fallback
export function apiErrorMessage(error, fallback = 'Something went wrong. Try again.') {
  if (!error?.response) return 'No connection to server.';
  if (error.response.status === 429 && !error.response.data?.error) return 'Too many attempts. Try again later.';
  return error.response.data?.error || error.response.data?.message || fallback;
}

// Error code and retry-after from backend
export function apiErrorInfo(error) {
  const data = error?.response?.data || {};
  const retry = Number(data.retry_after || error?.response?.headers?.['retry-after'] || 0);
  return { code: data.code || null, retryAfter: Number.isFinite(retry) ? retry : 0, data };
}
