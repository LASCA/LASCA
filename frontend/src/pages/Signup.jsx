import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import AuthLayout from '../components/auth/AuthLayout';
import { FormError, GoogleSection, RememberMe, SubmitButton, TextField } from '../components/auth/FormParts';
import { apiErrorMessage, useAuth } from '../auth/AuthContext';

export default function Signup() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const welcome = (user) => {
    toast.success(`Ο λογαριασμός δημιουργήθηκε. Καλώς ήρθες, ${user.display_name}!`);
    navigate(location.state?.from || '/app', { replace: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) return setError('Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες.');
    if (password !== confirm) return setError('Οι κωδικοί δεν ταιριάζουν.');

    setLoading(true);
    try {
      const user = await register({ email, password, displayName: displayName.trim(), remember });
      welcome(user);
    } catch (err) {
      setError(apiErrorMessage(err, 'Αποτυχία δημιουργίας λογαριασμού'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Δημιουργία λογαριασμού"
      subtitle="Δωρεάν, για όλους τους φοιτητές."
      footer={<>Έχεις ήδη λογαριασμό;{' '}
        <Link to="/login" state={location.state} className="font-bold text-slate-100 hover:underline">Σύνδεση</Link></>}
    >
      <GoogleSection remember={remember} onSuccess={welcome} text="signup_with" />
      <form onSubmit={handleSubmit} className="space-y-4">
        <TextField id="display_name" label="ΟΝΟΜΑ ΧΡΗΣΤΗ" value={displayName} onChange={setDisplayName}
          autoComplete="nickname" placeholder="π.χ. Γιώργος Π." required={false}
          hint="Φαίνεται στους συνεργάτες σου. Μπορείς να το αλλάξεις αργότερα." />
        <TextField id="email" label="EMAIL" type="email" value={email} onChange={setEmail}
          autoComplete="email" placeholder="onoma@auth.gr" />
        <TextField id="password" label="ΚΩΔΙΚΟΣ" type="password" value={password} onChange={setPassword}
          autoComplete="new-password" hint="Τουλάχιστον 8 χαρακτήρες." />
        <TextField id="confirm" label="ΕΠΙΒΕΒΑΙΩΣΗ ΚΩΔΙΚΟΥ" type="password" value={confirm} onChange={setConfirm}
          autoComplete="new-password" />
        <RememberMe checked={remember} onChange={setRemember} />
        <FormError message={error} />
        <SubmitButton loading={loading}>Δημιουργία λογαριασμού</SubmitButton>
      </form>
    </AuthLayout>
  );
}
