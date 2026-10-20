import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { SignUp } from '@clerk/react';
import AuthLayout from '../components/auth/AuthLayout.jsx';
import { TextField } from '../components/auth/FormParts';
import { clerkAuthAppearance } from '../auth/clerkTheme';
import usePageMeta from '../hooks/usePageMeta.js';

// Το Clerk αλλάζει βήμα (π.χ. κωδικός επιβεβαίωσης email) με το #… της διεύθυνσης.
function useClerkStep() {
  const read = () => (window.location.hash || '').replace(/^#\/?/, '');
  const [step, setStep] = useState(read);
  useEffect(() => {
    const update = () => setStep(read());
    window.addEventListener('hashchange', update);
    window.addEventListener('popstate', update);
    return () => { window.removeEventListener('hashchange', update); window.removeEventListener('popstate', update); };
  }, []);
  return step;
}

export default function Signup() {
  usePageMeta({ title: 'Δημιουργία λογαριασμού', description: 'Φτιάξε δωρεάν λογαριασμό στη LASCA: τοπογραφικοί υπολογισμοί, αναφορές και κοινά projects.' });
  const location = useLocation();
  const step = useClerkStep();
  const [school, setSchool] = useState('');
  const [company, setCompany] = useState('');
  // Τα προαιρετικά πεδία πάνε στο Clerk ως unsafeMetadata και από εκεί στη lasca.db (code/clerk_sync.py).
  const unsafeMetadata = useMemo(() => {
    const data = {};
    if (school.trim()) data.school = school.trim().slice(0, 120);
    if (company.trim()) data.company = company.trim().slice(0, 120);
    return data;
  }, [school, company]);
  const firstStep = !step && location.pathname.replace(/\/+$/, '') === '/signup';

  return (
    <AuthLayout
      eyebrow="Δωρεάν για φοιτητές"
      title="Δημιουργία λογαριασμού"
      wide
      dense
      footer={<>Έχεις ήδη λογαριασμό;{' '}
        <Link to="/login" state={location.state} className="font-medium text-blue-300 hover:text-blue-200">Σύνδεση</Link></>}
    >
      {firstStep && (
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 [&_input]:h-10">
          <TextField id="school" label="Σχολή" value={school} onChange={setSchool} required={false}
            autoComplete="off" placeholder="π.χ. ΑΤΜ ΑΠΘ" maxLength={120} />
          <TextField id="company" label="Εταιρεία" value={company} onChange={setCompany} required={false}
            autoComplete="organization" placeholder="π.χ. Γραφείο μελετών" maxLength={120} />
        </div>
      )}
      <SignUp forceRedirectUrl="/app" fallbackRedirectUrl="/app" signInUrl="/login" appearance={clerkAuthAppearance}
        unsafeMetadata={unsafeMetadata} />
    </AuthLayout>
  );
}
