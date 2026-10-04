import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Loader2, MailCheck } from 'lucide-react';
import AuthLayout from '../components/auth/AuthLayout';
import { FormError, SubmitButton, TextField, formatWait, useCooldown } from '../components/auth/FormParts';
import PasswordStrength from '../components/ui/PasswordStrength';
import Turnstile from '../components/ui/Turnstile';
import { API_BASE_URL } from '../config';
import { apiErrorInfo, apiErrorMessage, useAuth } from '../auth/AuthContext';
import usePageMeta from '../hooks/usePageMeta';

/** «Ξέχασα τον κωδικό»: στέλνει σύνδεσμο επαναφοράς. Η απάντηση είναι ίδια είτε υπάρχει λογαριασμός είτε όχι. */
export function ForgotPassword() {
  usePageMeta({ title: 'Ξέχασα τον κωδικό', noindex: true });
  const { captchaSiteKey } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email || '');
  const [token, setToken] = useState(null);
  const [captchaKey, setCaptchaKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const cooldown = useCooldown();

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (captchaSiteKey && !token) return setError('Επιβεβαίωσε ότι δεν είσαι ρομπότ.');
    setBusy(true);
    try {
      await axios.post(`${API_BASE_URL}/api/auth/forgot`, { email, captcha_token: token || undefined });
      setSent(true);
    } catch (err) {
      const info = apiErrorInfo(err);
      if (info.retryAfter) cooldown.start(info.retryAfter);
      setError(apiErrorMessage(err, 'Αποτυχία αποστολής'));
      setToken(null);
      setCaptchaKey((k) => k + 1);
    } finally { setBusy(false); }
  };

  if (sent) {
    return (
      <AuthLayout eyebrow="Έλεγξε το email σου" title="Σου στείλαμε σύνδεσμο"
        footer={<Link to="/login" className="l-link">Πίσω στη σύνδεση</Link>}>
        <div className="flex gap-4">
          <span className="l-icon-tile h-12 w-12 shrink-0"><MailCheck size={20} aria-hidden="true" /></span>
          <p className="text-[15px] leading-relaxed text-mist">
            Αν υπάρχει λογαριασμός με το <strong className="text-frost">{email}</strong>, θα λάβεις σε λίγα λεπτά
            email με σύνδεσμο για νέο κωδικό. Ο σύνδεσμος ισχύει 30 λεπτά και μία φορά. Κοίτα και στα ανεπιθύμητα.
          </p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout eyebrow="Επαναφορά κωδικού" title="Ξέχασες τον κωδικό;"
      subtitle="Γράψε το email του λογαριασμού σου και θα σου στείλουμε σύνδεσμο για νέο κωδικό."
      footer={<>Τον θυμήθηκες; <Link to="/login" className="l-link font-medium">Σύνδεση</Link></>}>
      <form onSubmit={submit} className="space-y-5">
        <TextField id="email" label="Email" type="email" value={email} onChange={setEmail}
          autoComplete="email" placeholder="onoma@auth.gr" maxLength={254} autoFocus />
        {captchaSiteKey && <Turnstile siteKey={captchaSiteKey} resetKey={captchaKey} action="forgot" onToken={setToken} />}
        <FormError message={error} />
        <SubmitButton loading={busy} disabled={cooldown.left > 0}>
          {cooldown.left > 0 ? `Δοκίμασε ξανά σε ${formatWait(cooldown.left)}` : 'Αποστολή συνδέσμου'}
        </SubmitButton>
      </form>
    </AuthLayout>
  );
}

/** Ορισμός νέου κωδικού από τον σύνδεσμο του email (/reset-password#token=...). */
export function ResetPassword() {
  usePageMeta({ title: 'Νέος κωδικός', noindex: true });
  const { passwordMin } = useAuth();
  const navigate = useNavigate();
  // Το token είναι στο # για να μη φτάνει ποτέ σε logs ή σε τρίτους (Referer). Το αφαιρούμε από τη γραμμή διευθύνσεων.
  const [token] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get('token') || '');
  const [check, setCheck] = useState({ state: 'loading', hint: '' });
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [valid, setValid] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (window.location.hash) window.history.replaceState(null, '', window.location.pathname);
    if (!token) { setCheck({ state: 'invalid' }); return; }
    axios.post(`${API_BASE_URL}/api/auth/reset/check`, { token })
      .then(({ data }) => setCheck({ state: 'ok', hint: data.email_hint }))
      .catch(() => setCheck({ state: 'invalid' }));
  }, [token]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!valid) return setError('Ο κωδικός δεν είναι αρκετά ισχυρός.');
    if (password !== confirm) return setError('Οι κωδικοί δεν ταιριάζουν.');
    setBusy(true);
    try {
      await axios.post(`${API_BASE_URL}/api/auth/reset`, { token, password });
      toast.success('Ο κωδικός άλλαξε. Συνδέσου με τον νέο κωδικό.');
      navigate('/login', { replace: true, state: { notice: '' } });
    } catch (err) {
      setError(apiErrorMessage(err, 'Αποτυχία αλλαγής κωδικού'));
    } finally { setBusy(false); }
  };

  if (check.state === 'loading') {
    return <AuthLayout title="Έλεγχος συνδέσμου…"><Loader2 className="mx-auto animate-spin text-fog" /></AuthLayout>;
  }
  if (check.state === 'invalid') {
    return (
      <AuthLayout eyebrow="Επαναφορά κωδικού" title="Ο σύνδεσμος δεν ισχύει"
        subtitle="Μπορεί να έληξε (ισχύει 30 λεπτά), να χρησιμοποιήθηκε ήδη ή να αντιγράφηκε λάθος.">
        <Link to="/forgot-password" className="l-btn l-btn-primary l-btn-lg w-full">Ζήτησε νέο σύνδεσμο</Link>
      </AuthLayout>
    );
  }
  return (
    <AuthLayout eyebrow="Επαναφορά κωδικού" title="Όρισε νέο κωδικό"
      subtitle={`Για τον λογαριασμό ${check.hint}. Μετά την αλλαγή αποσυνδέονται όλες οι συσκευές.`}>
      <form onSubmit={submit} className="space-y-5">
        <div className="space-y-2">
          <TextField id="password" label="Νέος κωδικός" type="password" value={password} onChange={setPassword}
            autoComplete="new-password" maxLength={128} describedBy="pw-strength" autoFocus />
          <PasswordStrength id="pw-strength" password={password} min={passwordMin} onValidity={setValid} />
        </div>
        <TextField id="confirm" label="Επιβεβαίωση" type="password" value={confirm} onChange={setConfirm}
          autoComplete="new-password" maxLength={128} error={confirm && confirm !== password ? 'Οι κωδικοί δεν ταιριάζουν.' : ''} />
        <FormError message={error} />
        <SubmitButton loading={busy}>Αποθήκευση νέου κωδικού</SubmitButton>
      </form>
    </AuthLayout>
  );
}

/** Επιβεβαίωση email από τον σύνδεσμο του email (/verify-email#token=...). */
export function VerifyEmail() {
  usePageMeta({ title: 'Επιβεβαίωση email', noindex: true });
  const { user, refresh } = useAuth();
  const [token] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get('token') || '');
  const [state, setState] = useState('loading');

  useEffect(() => {
    if (window.location.hash) window.history.replaceState(null, '', window.location.pathname);
    if (!token) { setState('invalid'); return; }
    axios.post(`${API_BASE_URL}/api/auth/verify-email`, { token })
      .then(() => { setState('ok'); refresh(); })
      .catch(() => setState('invalid'));
  }, [token, refresh]);

  if (state === 'loading') return <AuthLayout title="Επιβεβαίωση…"><Loader2 className="mx-auto animate-spin text-fog" /></AuthLayout>;
  if (state === 'invalid') {
    return (
      <AuthLayout eyebrow="Email" title="Ο σύνδεσμος δεν ισχύει"
        subtitle="Μπορεί να έληξε (ισχύει 48 ώρες) ή να χρησιμοποιήθηκε ήδη. Ζήτησε νέο από το Προφίλ.">
        <Link to={user ? '/profile' : '/login'} className="l-btn l-btn-primary l-btn-lg w-full">{user ? 'Στο προφίλ' : 'Σύνδεση'}</Link>
      </AuthLayout>
    );
  }
  return (
    <AuthLayout eyebrow="Email" title="Το email επιβεβαιώθηκε" subtitle="Ευχαριστούμε! Ο λογαριασμός σου είναι πλέον πλήρως ενεργός.">
      <Link to={user ? '/app' : '/login'} className="l-btn l-btn-primary l-btn-lg w-full">{user ? 'Άνοιγμα εφαρμογής' : 'Σύνδεση'}</Link>
    </AuthLayout>
  );
}
