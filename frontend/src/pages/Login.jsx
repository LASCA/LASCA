import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import AuthLayout from '../components/auth/AuthLayout';
import { FormError, GoogleSection, RememberMe, SubmitButton, TextField } from '../components/auth/FormParts';
import { apiErrorMessage, useAuth } from '../auth/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Αν ήρθε εδώ από protected σελίδα (π.χ. /profile), επιστρέφει εκεί μετά το login.
  const goNext = () => navigate(location.state?.from || '/app', { replace: true });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login({ email, password, remember });
      toast.success(`Καλώς ήρθες, ${user.display_name}!`);
      goNext();
    } catch (err) {
      setError(apiErrorMessage(err, 'Αποτυχία σύνδεσης'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Σύνδεση"
      subtitle="Συνέχισε από εκεί που σταμάτησες."
      footer={<>Δεν έχεις λογαριασμό;{' '}
        <Link to="/signup" className="font-bold text-slate-100 hover:underline">Δημιουργία λογαριασμού</Link></>}
    >
      <GoogleSection remember={remember} onSuccess={goNext} text="signin_with" />
      <form onSubmit={handleSubmit} className="space-y-4" noValidate={false}>
        <TextField id="email" label="EMAIL" type="email" value={email} onChange={setEmail}
          autoComplete="email" placeholder="onoma@auth.gr" />
        <TextField id="password" label="ΚΩΔΙΚΟΣ" type="password" value={password} onChange={setPassword}
          autoComplete="current-password" />
        <RememberMe checked={remember} onChange={setRemember} />
        <FormError message={error} />
        <SubmitButton loading={loading}>Σύνδεση</SubmitButton>
      </form>
    </AuthLayout>
  );
}
