import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { SignUp } from '@clerk/react';
import AuthLayout from '../components/auth/AuthLayout.jsx';
import { clerkAuthAppearance } from '../auth/clerkTheme';
import usePageMeta from '../hooks/usePageMeta.js';

export default function Signup() {
  usePageMeta({ title: 'Δημιουργία λογαριασμού', description: 'Φτιάξε δωρεάν λογαριασμό στη LASCA: τοπογραφικοί υπολογισμοί, αναφορές και κοινά projects.' });
  const location = useLocation();

  return (
    <AuthLayout
      eyebrow="Δωρεάν για φοιτητές"
      title="Δημιουργία λογαριασμού"
      wide
      dense
      footer={<>Έχεις ήδη λογαριασμό;{' '}
        <Link to="/login" state={location.state} className="font-medium text-blue-300 hover:text-blue-200">Σύνδεση</Link></>}
    >
      <SignUp forceRedirectUrl="/app" fallbackRedirectUrl="/app" signInUrl="/login" appearance={clerkAuthAppearance} />
    </AuthLayout>
  );
}
