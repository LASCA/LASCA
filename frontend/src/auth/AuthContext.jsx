import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';

// Όλα τα axios requests στέλνουν το cookie της σύνδεσης.
axios.defaults.withCredentials = true;

const AuthContext = createContext(null);

// Λέει στο backend ποιος είναι συνδεδεμένος και κρατάει τον χρήστη για όλη την εφαρμογή.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState({});

  const refresh = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API_BASE_URL}/api/me`);
      setUser(data || null);
      return data || null;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    let alive = true;
    Promise.all([
      refresh(),
      axios.get(`${API_BASE_URL}/api/auth/config`)
        .then(({ data }) => { if (alive) setConfig(data || {}); })
        .catch(() => {}),
    ]).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [refresh]);

  // Αν λήξει η σύνδεση (401 από οποιοδήποτε /api), ο χρήστης θεωρείται αποσυνδεδεμένος
  // και τα protected routes τον στέλνουν στο /login.
  useEffect(() => {
    const id = axios.interceptors.response.use(
      (res) => res,
      (error) => {
        const url = error.config?.url || '';
        const isAuthCall = /\/api\/(me|login|register|auth\/)/.test(url);
        if (error.response?.status === 401 && !isAuthCall) setUser(null);
        return Promise.reject(error);
      }
    );
    return () => axios.interceptors.response.eject(id);
  }, []);

  // Επιστρέφει { user } ή { twoFactor: { methods, email_hint } } όταν χρειάζεται δεύτερο βήμα.
  const finish = useCallback((data) => {
    if (data?.requires_2fa) return { twoFactor: { methods: data.methods || ['totp'], emailHint: data.email_hint } };
    setUser(data.user);
    return { user: data.user };
  }, []);

  const login = useCallback(async ({ email, password, remember, captchaToken }) => {
    const { data } = await axios.post(`${API_BASE_URL}/api/login`, {
      email, password, remember, captcha_token: captchaToken || undefined,
    });
    return finish(data);
  }, [finish]);

  const verifyTwoFactor = useCallback(async ({ code, method }) => {
    const { data } = await axios.post(`${API_BASE_URL}/api/auth/2fa/verify`, { code, method });
    setUser(data.user);
    return data.user;
  }, []);

  const sendTwoFactorEmail = useCallback(async () => {
    const { data } = await axios.post(`${API_BASE_URL}/api/auth/2fa/email`);
    return data;
  }, []);

  const register = useCallback(async ({ email, password, displayName, remember, acceptTerms, ageConfirmed, captchaToken, website }) => {
    const { data } = await axios.post(`${API_BASE_URL}/api/register`, {
      email, password, display_name: displayName, remember,
      accept_terms: acceptTerms, age_confirmed: ageConfirmed,
      captcha_token: captchaToken || undefined, website: website || undefined,
    });
    setUser(data.user);
    return data.user;
  }, []);

  const loginWithGoogle = useCallback(async (credential, { remember = true, acceptTerms, ageConfirmed } = {}) => {
    const { data } = await axios.post(`${API_BASE_URL}/api/auth/google`, {
      credential, remember, accept_terms: acceptTerms || undefined, age_confirmed: ageConfirmed || undefined,
    });
    return finish(data);
  }, [finish]);

  const logout = useCallback(async () => {
    try {
      await axios.post(`${API_BASE_URL}/api/logout`);
    } catch {
      // Αν η σύνδεση είχε ήδη λήξει, ο χρήστης είναι ούτως ή άλλως αποσυνδεδεμένος.
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo(() => ({
    user, setUser, loading, refresh, login, verifyTwoFactor, sendTwoFactorEmail, register, loginWithGoogle, logout,
    config, googleClientId: config.google_client_id || null, captchaSiteKey: config.captcha_site_key || null,
    passwordMin: config.password_min || 12, minAge: config.min_age || 15,
  }), [user, loading, refresh, login, verifyTwoFactor, sendTwoFactorEmail, register, loginWithGoogle, logout, config]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth πρέπει να χρησιμοποιείται μέσα σε <AuthProvider>');
  return ctx;
}

// Μήνυμα λάθους από απάντηση του backend ({ error: "..." }) ή γενικό.
export function apiErrorMessage(error, fallback = 'Κάτι πήγε στραβά. Δοκίμασε ξανά.') {
  if (!error?.response) return 'Δεν υπάρχει σύνδεση με τον server.';
  if (error.response.status === 429 && !error.response.data?.error) return 'Πάρα πολλές προσπάθειες. Δοκίμασε ξανά σε λίγο.';
  return error.response.data?.error || error.response.data?.message || fallback;
}

// Κωδικός λάθους (π.χ. captcha_required, account_locked) και δευτερόλεπτα αναμονής από το backend.
export function apiErrorInfo(error) {
  const data = error?.response?.data || {};
  const retry = Number(data.retry_after || error?.response?.headers?.['retry-after'] || 0);
  return { code: data.code || null, retryAfter: Number.isFinite(retry) ? retry : 0, data };
}
