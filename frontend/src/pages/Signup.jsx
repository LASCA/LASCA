import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { SignUp } from '@clerk/react';
import AuthLayout from '../components/auth/AuthLayout.jsx';
import { Checkbox, TextField } from '../components/auth/FormParts';
import { clerkSignUpAppearance } from '../auth/clerkTheme';
import { welcomeUrl } from '../auth/welcome';
import { SITE } from '../site';
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
const TERMS_ERROR = 'Για να δημιουργήσεις λογαριασμό, αποδέξου τους Όρους χρήσης.';
// Κουμπιά του Clerk που δημιουργούν λογαριασμό χωρίς τη φόρμα (Google κ.λπ.).
const SOCIAL_BUTTONS = '.cl-socialButtonsBlockButton, .cl-socialButtonsIconButton';

export default function Signup() {
  usePageMeta({ title: 'Δημιουργία λογαριασμού', description: 'Φτιάξε δωρεάν λογαριασμό στο LASCA: τοπογραφικοί υπολογισμοί, αναφορές και κοινά projects.' });
  const location = useLocation();
  const step = useClerkStep();
  const [school, setSchool] = useState('');
  const [company, setCompany] = useState('');
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [termsError, setTermsError] = useState('');
  const [termsHost, setTermsHost] = useState(null);
  const [termsFallback, setTermsFallback] = useState(false);
  const nameRef = useRef('');
  const acceptedRef = useRef(false);
  const formRef = useRef(null);
  nameRef.current = name;
  acceptedRef.current = accepted;

  // Τα πεδία μας πάνε στο Clerk ως unsafeMetadata και από εκεί στη lasca.db (code/clerk_sync.py).
  const unsafeMetadata = useMemo(() => {
    const data = {};
    if (clip(name)) data.name = clip(name).slice(0, 60);
    if (clip(school)) data.school = clip(school);
    if (clip(company)) data.company = clip(company);
    if (accepted) data.terms_version = SITE.termsVersion;
    return data;
  }, [name, school, company, accepted]);
  const firstStep = !step && location.pathname.replace(/\/+$/, '') === '/signup';
  const redirectUrl = welcomeUrl(location.state?.from);

  // Υποχρεωτικά: Όνομα και αποδοχή Όρων. Σταματάμε την υποβολή της φόρμας του Clerk (και το «Συνέχεια με
  // Google») πριν τη δει το Clerk: capture στο δικό μας πλαίσιο, που είναι γύρω από τη φόρμα του.
  useEffect(() => {
    const box = formRef.current;
    if (!box || !firstStep) return undefined;
    const block = (event) => {
      event.preventDefault();
      event.stopPropagation();
    };
    const onSubmit = (event) => {
      const nameOk = Boolean(clip(nameRef.current));
      if (nameOk && acceptedRef.current) return;
      block(event);
      if (!acceptedRef.current) setTermsError(TERMS_ERROR);
      if (!nameOk) {
        setNameError('Γράψε το όνομά σου. Το βλέπουν οι συνεργάτες σου.');
        document.getElementById('display_name')?.focus();
      } else {
        document.getElementById('accept-terms')?.focus();
      }
    };
    const onClick = (event) => {
      if (acceptedRef.current || !event.target.closest?.(SOCIAL_BUTTONS)) return;
      block(event);
      setTermsError(TERMS_ERROR);
      document.getElementById('accept-terms')?.focus();
    };
    box.addEventListener('submit', onSubmit, true);
    box.addEventListener('click', onClick, true);
    return () => {
      box.removeEventListener('submit', onSubmit, true);
      box.removeEventListener('click', onClick, true);
    };
  }, [firstStep]);

  // Το checkbox των Όρων μπαίνει μέσα στη φόρμα του Clerk, ακριβώς πάνω από το «Συνέχεια».
  // Αν για κάποιο λόγο δεν βρεθεί το κουμπί, εμφανίζεται κάτω από το Όνομα (δεν χάνεται ποτέ).
  useEffect(() => {
    const box = formRef.current;
    if (!box || !firstStep) return undefined;
    const host = document.createElement('div');
    host.className = 'lasca-terms-host';
    let placed = false;
    const place = () => {
      const button = box.querySelector('.cl-formButtonPrimary');
      if (!button?.parentNode || host.nextElementSibling === button) return;
      button.parentNode.insertBefore(host, button);
      if (!placed) { placed = true; setTermsHost(host); }
    };
    place();
    const observer = new MutationObserver(place);
    observer.observe(box, { childList: true, subtree: true });
    const timer = setTimeout(() => { if (!placed) setTermsFallback(true); }, 2500);
    return () => {
      observer.disconnect();
      clearTimeout(timer);
      host.remove();
      setTermsHost(null);
      setTermsFallback(false);
    };
  }, [firstStep]);

  const terms = (
    <div className="space-y-1.5">
      <Checkbox id="accept-terms" checked={accepted} onChange={(value) => { setAccepted(value); if (value) setTermsError(''); }}>
        Αποδέχομαι τους{' '}
        <Link to="/terms" target="_blank" className="font-medium text-blue-300 hover:text-blue-200">Όρους χρήσης</Link> και την{' '}
        <Link to="/privacy" target="_blank" className="font-medium text-blue-300 hover:text-blue-200">Πολιτική απορρήτου</Link>. *
      </Checkbox>
      {termsError && <p role="alert" className="pl-[26px] text-[12.5px] text-red-300">{termsError}</p>}
    </div>
  );

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
          <div className="mb-4 space-y-3 [&_input:not([type=checkbox])]:h-10">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <TextField id="school" label="Σχολή" value={school} onChange={setSchool} required={false}
                autoComplete="off" placeholder="π.χ. ΑΤΜ ΑΠΘ" maxLength={120} />
              <TextField id="company" label="Εταιρεία" value={company} onChange={setCompany} required={false}
                autoComplete="organization" placeholder="π.χ. Γραφείο μελετών" maxLength={120} />
            </div>
            <TextField id="display_name" label="Όνομα *" value={name} required
              onChange={(value) => { setName(value); if (clip(value)) setNameError(''); }}
              autoComplete="name" placeholder="π.χ. Κώστας Τ." maxLength={60} error={nameError} />
            {termsFallback && !termsHost && terms}
          </div>
        )}
        {firstStep && termsHost && createPortal(<div className="pb-1">{terms}</div>, termsHost)}
        <SignUp forceRedirectUrl={redirectUrl} fallbackRedirectUrl={redirectUrl} signInUrl="/login"
          appearance={clerkSignUpAppearance} unsafeMetadata={unsafeMetadata} />
      </div>
    </AuthLayout>
  );
}
