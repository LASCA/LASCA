import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { SignIn } from '@clerk/react';
import AuthLayout from '../components/auth/AuthLayout.jsx';
import { clerkAuthAppearance } from '../auth/clerkTheme';
import usePageMeta from '../hooks/usePageMeta.js';

// Ίδια σελίδα με το web-pages· τη φόρμα (κωδικός, Google, κωδικοί email, «Ξέχασες τον κωδικό;») τη δίνει το Clerk.
export default function Login() {
  usePageMeta({ title: 'Σύνδεση', description: 'Σύνδεση στο LASCA για να συνεχίσεις τα projects σου.' });
  const location = useLocation();
  const next = location.state?.from || '/app';

  return (
    <AuthLayout
      eyebrow="Γεια σου και πάλι..."
      title="Σύνδεση"
      subtitle="Συνέχισε από εκεί που σταμάτησες."
      footer={<>Δεν έχεις λογαριασμό;{' '}
        <Link to="/signup" state={location.state} className="font-medium text-blue-300 hover:text-blue-200">Δημιουργία λογαριασμού</Link></>}
    >
      <SignIn forceRedirectUrl={next} fallbackRedirectUrl="/app" signUpUrl="/signup" appearance={clerkAuthAppearance} />
    </AuthLayout>
  );
}
