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
  const [googleClientId, setGoogleClientId] = useState(null);

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
        .then(({ data }) => { if (alive) setGoogleClientId(data?.google_client_id || null); })
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

  const login = useCallback(async ({ email, password, remember }) => {
    const { data } = await axios.post(`${API_BASE_URL}/api/login`, { email, password, remember });
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async ({ email, password, displayName, remember }) => {
    const { data } = await axios.post(`${API_BASE_URL}/api/register`, {
      email, password, display_name: displayName, remember,
    });
    setUser(data.user);
    return data.user;
  }, []);

  const loginWithGoogle = useCallback(async (credential, remember = true) => {
    const { data } = await axios.post(`${API_BASE_URL}/api/auth/google`, { credential, remember });
    setUser(data.user);
    return data.user;
  }, []);

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
    user, setUser, loading, refresh, login, register, loginWithGoogle, logout, googleClientId,
  }), [user, loading, refresh, login, register, loginWithGoogle, logout, googleClientId]);

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
  return error.response.data?.error || error.response.data?.message || fallback;
}
