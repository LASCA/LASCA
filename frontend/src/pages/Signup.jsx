import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import AuthLayout from '../components/auth/AuthLayout';
import {
  Checkbox, FormError, GoogleSection, Honeypot, RememberMe, SubmitButton, TextField, formatWait, useCooldown,
} from '../components/auth/FormParts';
import PasswordStrength from '../components/ui/PasswordStrength';
import Turnstile from '../components/ui/Turnstile';
import { apiErrorInfo, apiErrorMessage, useAuth } from '../auth/AuthContext';
import usePageMeta from '../hooks/usePageMeta';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export default function Signup() {
  usePageMeta({ title: 'Δημιουργία λογαριασμού', description: 'Φτιάξε δωρεάν λογαριασμό στη LASCA: τοπογραφικοί υπολογισμοί, αναφορές και κοινά projects.' });
  const { register, captchaSiteKey, passwordMin, passwordRecommended, minAge } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [remember, setRemember] = useState(true);
  const [accepted, setAccepted] = useState(false);
  const [website, setWebsite] = useState('');
  const [captchaToken, setCaptchaToken] = useState(null);
  const [captchaKey, setCaptchaKey] = useState(0);
  const [pwValid, setPwValid] = useState(false);
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(location.state?.notice || '');
  const cooldown = useCooldown();

  const welcome = (user) => {
    toast.success(`Ο λογαριασμός δημιουργήθηκε. Καλώς ήρθες, ${user.display_name}!`);
    navigate(location.state?.from || '/app', { replace: true });
  };

  const emailError = touched && email && !EMAIL_RE.test(email) ? 'Γράψε ένα έγκυρο email.' : '';
  const confirmError = touched && confirm && password !== confirm ? 'Οι κωδικοί δεν ταιριάζουν.' : '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched(true);
    setError('');
    if (!EMAIL_RE.test(email)) return setError('Γράψε ένα έγκυρο email.');
    if (!pwValid) return setError('Ο κωδικός δεν είναι αρκετά ισχυρός. Δες τις οδηγίες κάτω από το πεδίο.');
    if (password !== confirm) return setError('Οι κωδικοί δεν ταιριάζουν.');
    if (!accepted) return setError('Πρέπει να αποδεχτείς τους όρους και να επιβεβαιώσεις την ηλικία σου.');
    if (captchaSiteKey && !captchaToken) return setError('Επιβεβαίωσε ότι δεν είσαι ρομπότ.');

    setLoading(true);
    try {
      const user = await register({
        email, password, displayName: displayName.trim(), remember, acceptTerms: true, ageConfirmed: true,
        captchaToken, website,
      });
      welcome(user);
    } catch (err) {
      const info = apiErrorInfo(err);
      if (info.retryAfter) cooldown.start(info.retryAfter);
      setError(apiErrorMessage(err, 'Αποτυχία δημιουργίας λογαριασμού'));
      setCaptchaToken(null);
      setCaptchaKey((k) => k + 1);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      eyebrow="Δωρεάν για φοιτητές"
      title="Δημιουργία λογαριασμού"
      subtitle="Λίγα δευτερόλεπτα, και όλα τα εργαλεία είναι δικά σου."
      wide
      footer={<>Έχεις ήδη λογαριασμό;{' '}
        <Link to="/login" state={location.state} className="l-link font-medium">Σύνδεση</Link></>}
    >
      <GoogleSection remember={remember} text="signup_with" terms={{ accepted }}
        onResult={(r) => (r.user ? welcome(r.user) : navigate('/login', { state: { ...location.state, notice: 'Ο λογαριασμός έχει έλεγχο δύο βημάτων. Συνδέσου για να συνεχίσεις.' } }))}
        onError={(msg) => setError(msg)} />
      <form onSubmit={handleSubmit} className="relative space-y-5" noValidate>
        <Honeypot value={website} onChange={setWebsite} />
        <TextField id="display_name" label="Όνομα χρήστη" value={displayName} onChange={setDisplayName}
          autoComplete="nickname" placeholder="π.χ. Γιώργος Π." required={false} maxLength={60}
          hint="Φαίνεται στους συνεργάτες σου. Αλλάζει όποτε θέλεις." />
        <TextField id="email" label="Email" type="email" value={email} onChange={setEmail}
          autoComplete="email" placeholder="onoma@auth.gr" maxLength={254} error={emailError} />
        <div className="space-y-2">
          <TextField id="password" label="Κωδικός" type="password" value={password} onChange={setPassword}
            autoComplete="new-password" maxLength={128} describedBy="password-strength" />
          <PasswordStrength id="password-strength" password={password} email={email} name={displayName}
            min={passwordMin} recommended={passwordRecommended} onValidity={setPwValid} />
        </div>
        <TextField id="confirm" label="Επιβεβαίωση κωδικού" type="password" value={confirm} onChange={setConfirm}
          autoComplete="new-password" maxLength={128} error={confirmError} />
        <div className="space-y-3 rounded-[10px] bg-input-fill p-4 shadow-[var(--shadow-hairline)]">
          <Checkbox id="accept" checked={accepted} onChange={setAccepted} required>
            Είμαι τουλάχιστον {minAge} ετών και αποδέχομαι τους{' '}
            <Link to="/terms" target="_blank" className="l-link">Όρους χρήσης</Link> και την{' '}
            <Link to="/privacy" target="_blank" className="l-link">Πολιτική απορρήτου</Link>.
          </Checkbox>
          <RememberMe checked={remember} onChange={setRemember} />
        </div>
        {captchaSiteKey && (
          <Turnstile siteKey={captchaSiteKey} resetKey={captchaKey} action="signup" onToken={setCaptchaToken} />
        )}
        <FormError message={error} />
        <SubmitButton loading={loading} disabled={cooldown.left > 0}>
          {cooldown.left > 0 ? `Δοκίμασε ξανά σε ${formatWait(cooldown.left)}` : 'Δημιουργία λογαριασμού'}
        </SubmitButton>
      </form>
    </AuthLayout>
  );
}
