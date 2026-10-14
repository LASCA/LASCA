import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import AuthLayout from '../components/auth/AuthLayout';
import { CheckEmail } from '../components/auth/AccountGates';
import {
  Checkbox, FormError, GoogleSection, Honeypot, RememberMe, SubmitButton, TextField, formatWait, useCooldown,
} from '../components/auth/FormParts';
import PasswordStrength from '../components/ui/PasswordStrength';
import Turnstile from '../components/ui/Turnstile';
import { apiErrorInfo, apiErrorMessage, useAuth } from '../auth/AuthContext';
import usePageMeta from '../hooks/usePageMeta';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const LINK = 'font-medium text-blue-300 hover:text-blue-200';

export default function Signup() {
  usePageMeta({ title: 'Δημιουργία λογαριασμού', description: 'Φτιάξε δωρεάν λογαριασμό στη LASCA: τοπογραφικοί υπολογισμοί, αναφορές και κοινά projects.' });
  const { register, captchaSiteKey, passwordMin, passwordRecommended, minAge } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [school, setSchool] = useState('');
  const [company, setCompany] = useState('');
  const [remember, setRemember] = useState(true);
  const [accepted, setAccepted] = useState(false);
  const [website, setWebsite] = useState('');
  const [captchaToken, setCaptchaToken] = useState(null);
  const [captchaKey, setCaptchaKey] = useState(0);
  const [pwValid, setPwValid] = useState(false);
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(location.state?.notice || '');
  const [sent, setSent] = useState(null);
  const cooldown = useCooldown();

  const welcome = (user) => {
    toast.success(`Ο λογαριασμός δημιουργήθηκε. Καλώς ήρθες, ${user.display_name}!`);
    navigate(location.state?.from || '/app', { replace: true });
  };

  const nameError = touched && !displayName.trim() ? 'Γράψε το όνομά σου.' : '';
  const emailError = touched && email && !EMAIL_RE.test(email) ? 'Γράψε ένα έγκυρο email.' : '';
  const confirmError = touched && confirm && password !== confirm ? 'Οι κωδικοί δεν ταιριάζουν.' : '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched(true);
    setError('');
    if (!displayName.trim()) return setError('Γράψε το όνομά σου. Το βλέπουν οι συνεργάτες σου.');
    if (!EMAIL_RE.test(email.trim())) return setError('Γράψε ένα έγκυρο email.');
    if (!pwValid) return setError('Ο κωδικός δεν είναι αρκετά ισχυρός. Δες την ένδειξη κάτω από τον κωδικό.');
    if (password !== confirm) return setError('Οι κωδικοί δεν ταιριάζουν.');
    if (!accepted) return setError('Πρέπει να αποδεχτείς τους όρους και να επιβεβαιώσεις την ηλικία σου.');
    if (captchaSiteKey && !captchaToken) return setError('Επιβεβαίωσε ότι δεν είσαι ρομπότ.');

    setLoading(true);
    try {
      const result = await register({
        email: email.trim(), password, displayName: displayName.trim(), school: school.trim(), company: company.trim(),
        remember, acceptTerms: true, ageConfirmed: true, captchaToken, website,
      });
      if (result.verify) setSent({ email: email.trim(), emailHint: result.verify.emailHint });
      else welcome(result.user);
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

  if (sent) {
    return (
      <AuthLayout eyebrow="Σχεδόν έτοιμο" title="Έλεγξε το email σου"
        subtitle="Ο λογαριασμός ενεργοποιείται μόλις πατήσεις τον σύνδεσμο που σου στείλαμε.">
        <CheckEmail email={sent.email} emailHint={sent.emailHint}
          onBack={() => navigate('/login', { state: { ...location.state, email: sent.email } })} />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      eyebrow="Δωρεάν για φοιτητές"
      title="Δημιουργία λογαριασμού"
      wide
      dense
      footer={<>Έχεις ήδη λογαριασμό;{' '}
        <Link to="/login" state={location.state} className={LINK}>Σύνδεση</Link></>}
    >
      <GoogleSection remember={remember} text="signup_with" terms={{ accepted }} dense
        onResult={(r) => (r.user ? welcome(r.user) : navigate('/login', { state: { ...location.state, notice: 'Ο λογαριασμός έχει έλεγχο δύο βημάτων. Συνδέσου για να συνεχίσεις.' } }))}
        onError={(msg) => setError(msg)} />
      <form onSubmit={handleSubmit} className="relative space-y-3 [&_input:not([type=checkbox])]:h-10" noValidate>
        <Honeypot value={website} onChange={setWebsite} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextField id="display_name" label="Όνομα" value={displayName} onChange={setDisplayName}
            autoComplete="name" placeholder="π.χ. Γιώργος Π." maxLength={60} error={nameError} />
          <TextField id="email" label="Email" type="email" value={email} onChange={setEmail}
            autoComplete="email" placeholder="onoma@auth.gr" maxLength={254} error={emailError} />
          <TextField id="password" label="Κωδικός" type="password" value={password} onChange={setPassword}
            autoComplete="new-password" maxLength={128} describedBy="password-strength" />
          <TextField id="confirm" label="Επιβεβαίωση κωδικού" type="password" value={confirm} onChange={setConfirm}
            autoComplete="new-password" maxLength={128} error={confirmError} />
        </div>
        <PasswordStrength id="password-strength" compact password={password} email={email} name={displayName}
          min={passwordMin} recommended={passwordRecommended} onValidity={setPwValid} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextField id="school" label="Σχολή" value={school} onChange={setSchool} required={false}
            autoComplete="off" placeholder="π.χ. ΑΤΜ ΑΠΘ" maxLength={120} />
          <TextField id="company" label="Εταιρεία" value={company} onChange={setCompany} required={false}
            autoComplete="organization" placeholder="π.χ. Γραφείο μελετών" maxLength={120} />
        </div>
        <div className="space-y-2 pt-1">
          <Checkbox id="accept" checked={accepted} onChange={setAccepted} required>
            Είμαι τουλάχιστον {minAge} ετών και αποδέχομαι τους{' '}
            <Link to="/terms" target="_blank" className={LINK}>Όρους χρήσης</Link> και την{' '}
            <Link to="/privacy" target="_blank" className={LINK}>Πολιτική απορρήτου</Link>.
          </Checkbox>
          <RememberMe checked={remember} onChange={setRemember} />
        </div>
        {captchaSiteKey && (
          <Turnstile siteKey={captchaSiteKey} resetKey={captchaKey} action="signup" compact onToken={setCaptchaToken} />
        )}
        <FormError message={error} />
        <SubmitButton loading={loading} disabled={cooldown.left > 0}>
          {cooldown.left > 0 ? `Δοκίμασε ξανά σε ${formatWait(cooldown.left)}` : 'Δημιουργία λογαριασμού'}
        </SubmitButton>
      </form>
    </AuthLayout>
  );
}
