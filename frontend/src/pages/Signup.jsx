import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { SignUp } from '@clerk/react';
import AuthLayout from '../components/auth/AuthLayout.jsx';
import { TextField } from '../components/auth/FormParts';
import { clerkSignUpAppearance } from '../auth/clerkTheme';
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

const clip = (value) => value.trim().replace(/\s+/g, ' ').slice(0, 120);

export default function Signup() {
  usePageMeta({ title: 'Δημιουργία λογαριασμού', description: 'Φτιάξε δωρεάν λογαριασμό στη LASCA: τοπογραφικοί υπολογισμοί, αναφορές και κοινά projects.' });
  const location = useLocation();
  const step = useClerkStep();
  const [school, setSchool] = useState('');
  const [company, setCompany] = useState('');
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');
  const nameRef = useRef('');
  const formRef = useRef(null);
  nameRef.current = name;

  // Τα πεδία μας πάνε στο Clerk ως unsafeMetadata και από εκεί στη lasca.db (code/clerk_sync.py).
  const unsafeMetadata = useMemo(() => {
    const data = {};
    if (clip(name)) data.name = clip(name).slice(0, 60);
    if (clip(school)) data.school = clip(school);
    if (clip(company)) data.company = clip(company);
    return data;
  }, [name, school, company]);
  const firstStep = !step && location.pathname.replace(/\/+$/, '') === '/signup';

  // Το Όνομα είναι υποχρεωτικό: σταματάμε την υποβολή της φόρμας του Clerk πριν τη δει το Clerk
  // (capture στο δικό μας πλαίσιο, που είναι γύρω από τη φόρμα του).
  useEffect(() => {
    const box = formRef.current;
    if (!box || !firstStep) return undefined;
    const onSubmit = (event) => {
      if (clip(nameRef.current)) return;
      event.preventDefault();
      event.stopPropagation();
      setNameError('Γράψε το όνομά σου. Το βλέπουν οι συνεργάτες σου.');
      document.getElementById('display_name')?.focus();
    };
    box.addEventListener('submit', onSubmit, true);
    return () => box.removeEventListener('submit', onSubmit, true);
  }, [firstStep]);

  return (
    <AuthLayout
      eyebrow="Δωρεάν για φοιτητές"
      title="Δημιουργία λογαριασμού"
      wide
      dense
      footer={<>Έχεις ήδη λογαριασμό;{' '}
        <Link to="/login" state={location.state} className="font-medium text-blue-300 hover:text-blue-200">Σύνδεση</Link></>}
    >
      <div ref={formRef}>
        {firstStep && (
          <div className="mb-4 space-y-3 [&_input]:h-10">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <TextField id="school" label="Σχολή" value={school} onChange={setSchool} required={false}
                autoComplete="off" placeholder="π.χ. ΑΤΜ ΑΠΘ" maxLength={120} />
              <TextField id="company" label="Εταιρεία" value={company} onChange={setCompany} required={false}
                autoComplete="organization" placeholder="π.χ. Γραφείο μελετών" maxLength={120} />
            </div>
            <TextField id="display_name" label="Όνομα *" value={name} required
              onChange={(value) => { setName(value); if (clip(value)) setNameError(''); }}
              autoComplete="name" placeholder="π.χ. Κώστας Τ." maxLength={60} error={nameError} />
          </div>
        )}
        <SignUp forceRedirectUrl="/app" fallbackRedirectUrl="/app" signInUrl="/login" appearance={clerkSignUpAppearance}
          unsafeMetadata={unsafeMetadata} />
      </div>
    </AuthLayout>
  );
}
