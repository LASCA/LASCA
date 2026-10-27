import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { useAuth as useClerkAuth, useClerk } from '@clerk/react';
import { API_BASE_URL } from '../config';

// All axios requests send credentials with requests
axios.defaults.withCredentials = true;

const AuthContext = createContext(null);

// Καινούργιο token από το Clerk (όχι το αποθηκευμένο), για επανάληψη μετά από 401.
async function freshToken(getToken) {
  try {
    return await getToken({ skipCache: true });
  } catch {
    return null;
  }
}

// Αιτήματα προς το δικό μας API (σχετικό /api/... ή ίδιο origin / API_BASE_URL).
function isLascaApi(url) {
  if (!url) return false;
  try {
    const target = new URL(url, window.location.origin);
    const base = new URL(API_BASE_URL || window.location.origin, window.location.origin);
    return target.origin === base.origin && target.pathname.startsWith('/api/');
  } catch {
    return false;
  }
}

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
  const refreshRef = useRef(null);

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
      const status = error.response?.status;
      if (status === 409) {
        setNeedsTermsAcceptance(true);
        return null;
      }
      // Μόνο αν ο server πει ρητά «δεν είσαι συνδεδεμένος». Ένα προσωρινό σφάλμα (δίκτυο, 5xx, αργός server)
      // δεν βγάζει τον χρήστη από την εφαρμογή.
      if (status === 401 || status === 403) {
        setUser(null);
        setNeedsTermsAcceptance(false);
      }
      return null;
    }
  }, [getToken]);

  useEffect(() => { refreshRef.current = refresh; }, [refresh]);

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
        const status = error.response?.status;
        if (alive && status === 409) {
          setNeedsTermsAcceptance(true);
        } else if (alive && (status === 401 || status === 403)) {
          setUser(null);
          setNeedsTermsAcceptance(false);
        } else if (alive) {
          // Προσωρινό σφάλμα (δίκτυο / server): μία ακόμα προσπάθεια πριν δείξουμε τη σύνδεση.
          await new Promise((resolve) => { setTimeout(resolve, 1500); });
          if (alive) await refreshRef.current?.();
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

  // 401 από το API: το token του Clerk ζει ~60″ και μπορεί να λήξει ενώ το αίτημα περιμένει (π.χ. αργός
  // υπολογισμός). Ξαναδοκιμάζουμε ΜΙΑ φορά με καινούργιο token· αποσύνδεση μόνο αν το /api/me το επιβεβαιώσει.
  useEffect(() => {
    const id = axios.interceptors.response.use(
      (res) => res,
      async (error) => {
        const config = error.config || {};
        const url = config.url || '';
        const isAuthCall = /\/api\/(me|auth\/)/.test(url);
        if (error.response?.status !== 401 || isAuthCall || !isLascaApi(url)) return Promise.reject(error);
        if (isSignedIn && !config.__lascaRetried) {
          const token = await freshToken(getTokenRef.current);
          if (token) {
            config.__lascaRetried = true;
            config.headers = { ...(config.headers || {}), Authorization: `Bearer ${token}` };
            return axios.request(config);
          }
        }
        refreshRef.current?.();
        return Promise.reject(error);
      }
    );
    return () => axios.interceptors.response.eject(id);
  }, [isSignedIn]);

  // Το token του Clerk μπαίνει σε ΚΑΘΕ αίτημα προς το API του LASCA: axios και fetch (πολλά εργαλεία,
  // π.χ. φόρτωση/αποθήκευση project και υπολογισμοί, χρησιμοποιούν fetch). Ποτέ σε άλλους servers.
  useEffect(() => {
    const id = axios.interceptors.request.use(
      async (config) => {
        if (isSignedIn && isLascaApi(config.url)) {
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

  useEffect(() => {
    if (!isSignedIn || typeof window === 'undefined') return undefined;
    const originalFetch = window.fetch;
    const withToken = async (input, init = {}) => {
      const url = typeof input === 'string' ? input : input?.url;
      if (!isLascaApi(url)) return originalFetch(input, init);
      const headers = new Headers(init.headers || (typeof input === 'object' ? input.headers : undefined));
      if (headers.has('Authorization')) return originalFetch(input, { ...init, headers });
      const token = await getToken().catch(() => null);
      if (token) headers.set('Authorization', `Bearer ${token}`);
      const res = await originalFetch(input, { ...init, headers });
      // Το token έληξε στον δρόμο: μία ακόμα προσπάθεια με καινούργιο (μόνο όταν το σώμα ξαναστέλνεται).
      const body = init.body;
      const resendable = body == null || typeof body === 'string' || body instanceof FormData || body instanceof Blob
        || body instanceof URLSearchParams;
      if (res.status !== 401 || !resendable) return res;
      const fresh = await freshToken(getToken);
      if (!fresh) return res;
      headers.set('Authorization', `Bearer ${fresh}`);
      return originalFetch(input, { ...init, headers });
    };
    window.fetch = withToken;
    return () => { if (window.fetch === withToken) window.fetch = originalFetch; };
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
