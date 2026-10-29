import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { useAuth as useClerkAuth } from '@clerk/react';
import { useAuth } from './AuthContext';
import LascaLoader from '../components/animations/LascaLoader';
import { TermsGate, VerifyEmailGate } from '../components/auth/AccountGates';
import { welcomeUrl } from './welcome';

export function FullScreenLoader({ label = 'ΦΟΡΤΩΣΗ...' }) {
  return (
    <div className="h-full w-full bg-canvas flex flex-col items-center justify-center">
      <LascaLoader variant="redBlue" size={140} glow breathe />
      <p className="mt-6 text-fog font-mono text-xs tracking-[0.3em] animate-pulse" role="status">{label}</p>
    </div>
  );
}

// Σελίδες μόνο για συνδεδεμένους (/app, /profile, /desktop-login).
// Με ?signup=1 (π.χ. «Δημιουργία λογαριασμού» από το πρόγραμμα των Windows) πάει στην εγγραφή
// αντί για τη σύνδεση· και στις δύο περιπτώσεις μετά γυρνάει εδώ.
export function RequireAuth({ children }) {
  const { user, loading, needsTermsAcceptance, emailVerificationRequired } = useAuth();
  const location = useLocation();
  if (loading) return <FullScreenLoader />;
  if (needsTermsAcceptance) return <TermsGate />;
  if (!user) {
    const signup = new URLSearchParams(location.search || window.location.search).get('signup') === '1';
    return <Navigate to={signup ? '/signup' : '/login'} replace state={{ from: location.pathname }} />;
  }
  // Πρώτα επιβεβαίωση email (αν την απαιτεί ο server), μετά αποδοχή των τρεχόντων Όρων.
  if (emailVerificationRequired && !user.email_verified) return <VerifyEmailGate />;
  if (user.terms_current === false) return <TermsGate />;
  return children;
}

// Σελίδες μόνο για μη συνδεδεμένους (/login, /signup): αν είσαι ήδη μέσα, πας στην εφαρμογή.
// Η Εγγραφή (signedInTo="/welcome"): μόλις το Clerk ενεργοποιήσει τον νέο λογαριασμό, κατευθείαν η σελίδα
// καλωσορίσματος, χωρίς να περιμένουμε τον server (το /api/me συνεχίζει στο παρασκήνιο).
export function GuestOnly({ children, signedInTo }) {
  const { user, loading } = useAuth();
  const { isSignedIn } = useClerkAuth();
  const location = useLocation();
  if (signedInTo === '/welcome' && isSignedIn) return <Navigate to={welcomeUrl(location.state?.from)} replace />;
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
