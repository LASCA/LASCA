import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { useAuth } from './AuthContext';
import LascaLoader from '../components/animations/LascaLoader';

export function FullScreenLoader({ label = 'ΦΟΡΤΩΣΗ...' }) {
  return (
    <div className="h-full w-full bg-canvas flex flex-col items-center justify-center">
      <LascaLoader variant="cycle" size={140} glow breathe />
      <p className="mt-6 text-fog font-mono text-xs tracking-[0.3em] animate-pulse" role="status">{label}</p>
    </div>
  );
}

// Σελίδες μόνο για συνδεδεμένους (/app, /profile).
export function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
}

// Σελίδες μόνο για μη συνδεδεμένους (/login, /signup): αν είσαι ήδη μέσα, πας στην εφαρμογή.
export function GuestOnly({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <FullScreenLoader />;
  // π.χ. από σύνδεσμο πρόσκλησης: μετά τη σύνδεση γυρνάμε εκεί
  if (user) return <Navigate to={location.state?.from || '/app'} replace />;
  return children;
}

// Ενεργοποιεί το Google login μόνο αν ο server έχει GOOGLE_CLIENT_ID.
export function GoogleProviderGate({ children }) {
  const { googleClientId } = useAuth();
  if (!googleClientId) return children;
  return <GoogleOAuthProvider clientId={googleClientId}>{children}</GoogleOAuthProvider>;
}
