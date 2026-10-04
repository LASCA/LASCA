import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, KeyRound, Mail, Smartphone } from 'lucide-react';
import AuthLayout from '../components/auth/AuthLayout';
import {
  FormError, GoogleSection, RememberMe, SubmitButton, TextField, formatWait, useCooldown,
} from '../components/auth/FormParts';
import Turnstile from '../components/ui/Turnstile';
import { apiErrorInfo, apiErrorMessage, useAuth } from '../auth/AuthContext';
import usePageMeta from '../hooks/usePageMeta';

export default function Login() {
  usePageMeta({ title: 'Σύνδεση', description: 'Σύνδεση στη LASCA για να συνεχίσεις τα projects σου.' });
  const { login, captchaSiteKey } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(location.state?.notice || '');
  const [captcha, setCaptcha] = useState({ needed: false, token: null, key: 0 });
  const [twoFactor, setTwoFactor] = useState(null);
  const cooldown = useCooldown();

  // Αν ήρθε εδώ από protected σελίδα (π.χ. /profile), επιστρέφει εκεί μετά το login.
  const goNext = (user) => {
    if (user) toast.success(`Καλώς ήρθες, ${user.display_name}!`);
    navigate(location.state?.from || '/app', { replace: true });
  };

  const handleResult = (result) => {
    if (result.twoFactor) setTwoFactor(result.twoFactor);
    else goNext(result.user);
  };

  const handleError = (err) => {
    const info = apiErrorInfo(err);
    setError(apiErrorMessage(err, 'Αποτυχία σύνδεσης'));
    if (info.retryAfter && (info.code === 'rate_limited' || info.code === 'slow_down' || info.code === 'account_locked')) {
      cooldown.start(info.retryAfter);
    }
    if (info.code === 'captcha_required' || info.data.captcha_required) {
      setCaptcha((c) => ({ needed: true, token: null, key: c.key + 1 }));
    } else if (captcha.needed) {
      setCaptcha((c) => ({ ...c, token: null, key: c.key + 1 }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (captcha.needed && captchaSiteKey && !captcha.token) {
      setError('Επιβεβαίωσε ότι δεν είσαι ρομπότ.');
      return;
    }
    setLoading(true);
    try {
      handleResult(await login({ email, password, remember, captchaToken: captcha.token }));
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  if (twoFactor) {
    return <TwoFactorStep info={twoFactor} onDone={goNext} onBack={() => { setTwoFactor(null); setPassword(''); }} />;
  }

  return (
    <AuthLayout
      eyebrow="Καλώς ήρθες πίσω"
      title="Σύνδεση"
      subtitle="Συνέχισε από εκεί που σταμάτησες."
      footer={<>Δεν έχεις λογαριασμό;{' '}
        <Link to="/signup" state={location.state} className="l-link font-medium">Δημιουργία λογαριασμού</Link></>}
    >
      <GoogleSection remember={remember} onResult={handleResult} text="signin_with"
        onError={(msg, info) => {
          if (info?.code === 'terms_required') {
            navigate('/signup', { state: { ...location.state, notice: 'Δεν υπάρχει λογαριασμός με αυτό το Google. Αποδέξου τους όρους για να δημιουργηθεί.' } });
          } else setError(msg);
        }} />
      <form onSubmit={handleSubmit} className="space-y-5">
        <TextField id="email" label="Email" type="email" value={email} onChange={setEmail}
          autoComplete="username" placeholder="onoma@auth.gr" maxLength={254} autoFocus />
        <div className="space-y-1.5">
          <TextField id="password" label="Κωδικός" type="password" value={password} onChange={setPassword}
            autoComplete="current-password" maxLength={128} />
          <div className="text-right">
            <Link to="/forgot-password" state={{ email }} className="text-[13px] text-mist hover:text-white">Ξέχασες τον κωδικό;</Link>
          </div>
        </div>
        <RememberMe checked={remember} onChange={setRemember} />
        {captcha.needed && captchaSiteKey && (
          <Turnstile siteKey={captchaSiteKey} resetKey={captcha.key} action="login"
            onToken={(token) => setCaptcha((c) => ({ ...c, token }))} />
        )}
        <FormError message={error} />
        <SubmitButton loading={loading} disabled={cooldown.left > 0}>
          {cooldown.left > 0 ? `Δοκίμασε ξανά σε ${formatWait(cooldown.left)}` : 'Σύνδεση'}
        </SubmitButton>
      </form>
    </AuthLayout>
  );
}

/** Δεύτερο βήμα: κωδικός από εφαρμογή authenticator, εφεδρικός κωδικός ή κωδικός μέσω email. */
function TwoFactorStep({ info, onDone, onBack }) {
  const { verifyTwoFactor, sendTwoFactorEmail } = useAuth();
  const [method, setMethod] = useState('totp');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const cooldown = useCooldown();

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      onDone(await verifyTwoFactor({ code: code.trim(), method }));
    } catch (err) {
      const i = apiErrorInfo(err);
      if (i.code === '2fa_expired') { onBack(); toast.error(apiErrorMessage(err)); return; }
      if (i.retryAfter) cooldown.start(i.retryAfter);
      setError(apiErrorMessage(err, 'Λάθος κωδικός'));
      setCode('');
    } finally { setBusy(false); }
  };

  const sendEmail = async () => {
    setError('');
    try {
      const data = await sendTwoFactorEmail();
      setMethod('email');
      setCode('');
      setNotice(`Στείλαμε κωδικό 6 ψηφίων στο ${data.email_hint}. Ισχύει 10 λεπτά.`);
    } catch (err) {
      setError(apiErrorMessage(err, 'Δεν στάλθηκε το email'));
    }
  };

  const meta = {
    totp: { icon: Smartphone, label: 'Κωδικός από την εφαρμογή', hint: 'Άνοιξε το Google Authenticator, Microsoft Authenticator ή όποια εφαρμογή χρησιμοποιείς.', placeholder: '000000', inputMode: 'numeric', max: 6 },
    backup: { icon: KeyRound, label: 'Εφεδρικός κωδικός', hint: 'Ένας από τους 10 κωδικούς που αποθήκευσες. Κάθε κωδικός ισχύει μία φορά.', placeholder: 'xxxxx-xxxxx', inputMode: 'text', max: 11 },
    email: { icon: Mail, label: 'Κωδικός από το email', hint: notice || 'Πάτα «Αποστολή στο email».', placeholder: '000000', inputMode: 'numeric', max: 6 },
  }[method];

  return (
    <AuthLayout eyebrow="Έλεγχος δύο βημάτων" title="Επιβεβαίωσε ότι είσαι εσύ"
      subtitle="Ο λογαριασμός σου προστατεύεται με δεύτερο βήμα."
      footer={<button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-mist hover:text-white"><ArrowLeft size={14} /> Πίσω στη σύνδεση</button>}>
      <form onSubmit={submit} className="space-y-5">
        <div className="space-y-1.5">
          <label htmlFor="otp" className="l-label inline-flex items-center gap-2"><meta.icon size={15} aria-hidden="true" /> {meta.label}</label>
          <input id="otp" value={code} onChange={(e) => setCode(method === 'backup' ? e.target.value : e.target.value.replace(/\D/g, ''))}
            className="l-input l-input-code" inputMode={meta.inputMode} autoComplete="one-time-code" maxLength={meta.max}
            placeholder={meta.placeholder} autoFocus required aria-describedby="otp-hint" />
          <p id="otp-hint" className="text-[13px] text-fog">{meta.hint}</p>
        </div>
        <FormError message={error} />
        <SubmitButton loading={busy} disabled={cooldown.left > 0 || (method !== 'backup' && code.length !== 6)}>
          {cooldown.left > 0 ? `Περίμενε ${formatWait(cooldown.left)}` : 'Επιβεβαίωση'}
        </SubmitButton>
      </form>
      <div className="mt-6 space-y-2 border-t border-glass-edge pt-5 text-[14px]">
        {method !== 'totp' && (
          <button type="button" className="block text-mist hover:text-white" onClick={() => { setMethod('totp'); setCode(''); }}>Χρήση εφαρμογής authenticator</button>
        )}
        {method !== 'backup' && (
          <button type="button" className="block text-mist hover:text-white" onClick={() => { setMethod('backup'); setCode(''); }}>Χρήση εφεδρικού κωδικού</button>
        )}
        {info.methods?.includes('email') && (
          <button type="button" className="block text-mist hover:text-white" onClick={sendEmail}>
            {method === 'email' ? 'Αποστολή νέου κωδικού' : `Αποστολή κωδικού στο email (${info.emailHint})`}
          </button>
        )}
      </div>
    </AuthLayout>
  );
}
