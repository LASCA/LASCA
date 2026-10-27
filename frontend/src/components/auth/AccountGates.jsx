import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { FileText, Loader2, MailCheck } from 'lucide-react';
import AuthLayout from './AuthLayout';
import { Checkbox, FormError, GHOST_BUTTON, PRIMARY_BUTTON, formatWait, useCooldown } from './FormParts';
import { API_BASE_URL } from '../../config';
import { apiErrorInfo, apiErrorMessage, useAuth } from '../../auth/AuthContext';

/**
 * «Έλεγξε το email σου»: μετά την εγγραφή, ή όταν κάποιος προσπαθεί να συνδεθεί χωρίς να έχει επιβεβαιώσει.
 * Ο λογαριασμός ενεργοποιείται μόνο από τον σύνδεσμο του email (προστασία από bots).
 */
export function CheckEmail({ email, emailHint, onBack, backLabel = 'Πίσω στη σύνδεση' }) {
  const { resendVerification } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const cooldown = useCooldown();

  const resend = async () => {
    setBusy(true); setError('');
    try {
      await resendVerification(email);
      toast.success('Στάλθηκε νέος σύνδεσμος. Δες και τα «Ανεπιθύμητα».');
      cooldown.start(60);
    } catch (err) {
      const info = apiErrorInfo(err);
      if (info.retryAfter) cooldown.start(info.retryAfter);
      setError(apiErrorMessage(err, 'Δεν στάλθηκε το email'));
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-5">
      <div className="flex gap-3.5 rounded-2xl border border-blue-500/25 bg-blue-500/[0.07] p-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-600/20 text-blue-300"><MailCheck size={19} /></span>
        <p className="text-[14px] leading-relaxed text-slate-300">
          Στείλαμε σύνδεσμο επιβεβαίωσης στο <strong className="text-white">{emailHint || email}</strong>.
          Άνοιξέ τον για να ενεργοποιηθεί ο λογαριασμός σου (ισχύει 48 ώρες). Αν δεν τον βλέπεις, δες και τα «Ανεπιθύμητα».
        </p>
      </div>
      <FormError message={error} />
      <button type="button" onClick={resend} disabled={busy || cooldown.left > 0 || !email} className={GHOST_BUTTON}>
        {busy && <Loader2 size={16} className="animate-spin" />}
        {cooldown.left > 0 ? `Νέο email σε ${formatWait(cooldown.left)}` : 'Στείλε ξανά το email'}
      </button>
      {onBack && <button type="button" onClick={onBack} className="block w-full text-center text-[14px] text-slate-400 hover:text-white">{backLabel}</button>}
    </div>
  );
}

/** Συνδεδεμένος χωρίς επιβεβαιωμένο email (λογαριασμός από πριν γίνει υποχρεωτική η επιβεβαίωση). */
export function VerifyEmailGate() {
  const { user, refresh, logout } = useAuth();
  const [busy, setBusy] = useState(null);
  const cooldown = useCooldown();

  const resend = async () => {
    setBusy('send');
    try {
      await axios.post(`${API_BASE_URL}/api/me/verify-email`);
      toast.success('Στάλθηκε νέος σύνδεσμος.');
      cooldown.start(60);
    } catch (err) {
      const info = apiErrorInfo(err);
      if (info.retryAfter) cooldown.start(info.retryAfter);
      toast.error(apiErrorMessage(err, 'Δεν στάλθηκε το email'));
    } finally { setBusy(null); }
  };
  const check = async () => {
    setBusy('check');
    const me = await refresh();
    setBusy(null);
    if (!me?.email_verified) toast('Δεν έχει επιβεβαιωθεί ακόμα. Άνοιξε τον σύνδεσμο από το email.', { icon: '✉️' });
  };

  return (
    <AuthLayout eyebrow="Ένα βήμα ακόμα" title="Επιβεβαίωσε το email σου"
      subtitle="Για να προστατεύουμε το LASCA από ψεύτικους λογαριασμούς, κάθε λογαριασμός ενεργοποιείται από το email του.">
      <div className="space-y-3">
        <div className="flex gap-3.5 rounded-2xl border border-blue-500/25 bg-blue-500/[0.07] p-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-600/20 text-blue-300"><MailCheck size={19} /></span>
          <p className="text-[14px] leading-relaxed text-slate-300">Πάτα «Στείλε μου σύνδεσμο» και άνοιξε το email που θα έρθει στο <strong className="text-white">{user?.email}</strong>.</p>
        </div>
        <button type="button" onClick={resend} disabled={Boolean(busy) || cooldown.left > 0} className={PRIMARY_BUTTON}>
          {busy === 'send' && <Loader2 size={16} className="animate-spin" />}
          {cooldown.left > 0 ? `Νέο email σε ${formatWait(cooldown.left)}` : 'Στείλε μου σύνδεσμο'}
        </button>
        <button type="button" onClick={check} disabled={Boolean(busy)} className={GHOST_BUTTON}>
          {busy === 'check' && <Loader2 size={16} className="animate-spin" />} Το επιβεβαίωσα
        </button>
        <button type="button" onClick={() => logout()} className="block w-full pt-1 text-center text-[14px] text-slate-400 hover:text-white">Αποσύνδεση</button>
      </div>
    </AuthLayout>
  );
}

/** Νέοι Όροι χρήσης: όσοι είχαν αποδεχτεί παλαιότερη έκδοση τους αποδέχονται ξανά πριν συνεχίσουν. */
export function TermsGate() {
  const { acceptTerms, logout } = useAuth();
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const accept = async () => {
    if (!checked) { setError('Τσέκαρε ότι διάβασες και αποδέχεσαι τους νέους Όρους.'); return; }
    setBusy(true); setError('');
    try { await acceptTerms(); } catch (err) { setError(apiErrorMessage(err)); } finally { setBusy(false); }
  };

  return (
    <AuthLayout eyebrow="Ενημέρωση" title="Νέοι Όροι χρήσης" wide
      subtitle="Ενημερώσαμε τους Όρους χρήσης. Διάβασέ τους και αποδέξου τους για να συνεχίσεις.">
      <div className="space-y-4">
        <ul className="space-y-2 rounded-2xl border border-slate-800 bg-[#0B1221] p-4 text-[13.5px] leading-relaxed text-slate-300 [&>li]:flex [&>li]:gap-2.5">
          <li><FileText size={15} className="mt-0.5 shrink-0 text-blue-300" />
            <span>Το LASCA είναι <strong className="text-white">δωρεάν στη σημερινή του φάση</strong>. Στο μέλλον μπορεί να αποκτήσει συνδρομητικά πακέτα.</span></li>
          <li><FileText size={15} className="mt-0.5 shrink-0 text-blue-300" />
            <span>Η δωρεάν πρόσβαση <strong className="text-white">δεν είναι εγγυημένη για πάντα</strong>, ούτε για όσους έχουν ήδη λογαριασμό: μπορεί να περιοριστεί ή να σταματήσει, με ειδοποίηση τουλάχιστον 30 ημέρες πριν.</span></li>
          <li><FileText size={15} className="mt-0.5 shrink-0 text-blue-300" />
            <span>Καμία χρέωση χωρίς τη δική σου ρητή επιλογή, και πάντα θα μπορείς να κατεβάσεις τα projects σου.</span></li>
        </ul>
        <Checkbox id="accept-terms" checked={checked} onChange={setChecked}>
          Διάβασα και αποδέχομαι τους νέους <Link to="/terms" target="_blank" className="font-medium text-blue-300 hover:text-blue-200">Όρους χρήσης</Link>.
        </Checkbox>
        <FormError message={error} />
        <button type="button" onClick={accept} disabled={busy} className={PRIMARY_BUTTON}>
          {busy && <Loader2 size={16} className="animate-spin" />} Αποδοχή και συνέχεια
        </button>
        <button type="button" onClick={() => logout()} className="block w-full text-center text-[14px] text-slate-400 hover:text-white">Αποσύνδεση</button>
      </div>
    </AuthLayout>
  );
}
