import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { CheckCircle2, Loader2, Monitor, ShieldAlert, XCircle } from 'lucide-react';
import AuthLayout from '../components/auth/AuthLayout';
import { API_BASE_URL } from '../config';
import { apiErrorMessage, useAuth } from '../auth/AuthContext';
import usePageMeta from '../hooks/usePageMeta';

/**
 * /desktop-login/<request_id>: το πρόγραμμα των Windows άνοιξε αυτή τη σελίδα για να συνδεθεί
 * (με Google ή με ό,τι χρησιμοποιεί ο χρήστης στη σελίδα). Ο χρήστης είναι ήδη συνδεδεμένος εδώ
 * (RequireAuth) και εγκρίνει, αφού δει ότι ο κωδικός είναι ίδιος με αυτόν στο πρόγραμμα.
 */
export default function DesktopLogin() {
  usePageMeta({ title: 'Σύνδεση προγράμματος', noindex: true });
  const { rid } = useParams();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [info, setInfo] = useState(null);
  const [state, setState] = useState('loading');   // loading | pending | approved | denied | expired | invalid
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    axios.get(`${API_BASE_URL}/api/auth/desktop/${encodeURIComponent(rid)}`)
      .then(({ data }) => { setInfo(data); setState(data.status); })
      .catch(() => setState('invalid'));
  }, [rid]);

  const answer = async (kind) => {
    setBusy(kind); setError('');
    try {
      const { data } = await axios.post(`${API_BASE_URL}/api/auth/desktop/${encodeURIComponent(rid)}/${kind}`);
      setState(data.status === 'approved' ? 'approved' : 'denied');
    } catch (err) {
      const code = err?.response?.data?.code;
      if (code === 'expired') setState('expired');
      else setError(apiErrorMessage(err, 'Αποτυχία. Δοκίμασε ξανά.'));
    } finally { setBusy(null); }
  };

  const switchAccount = async () => {
    await logout();
    navigate('/login', { replace: true, state: { from: `/desktop-login/${rid}` } });
  };

  if (state === 'loading') {
    return <AuthLayout title="Σύνδεση προγράμματος…"><Loader2 className="mx-auto animate-spin text-fog" /></AuthLayout>;
  }
  if (state === 'approved') {
    return (
      <AuthLayout eyebrow="LASCA για Windows" title="Το πρόγραμμα συνδέθηκε"
        subtitle="Γύρνα στο πρόγραμμα: σε λίγα δευτερόλεπτα θα είσαι μέσα. Μπορείς να κλείσεις αυτή την καρτέλα.">
        <div className="flex items-center gap-3 rounded-xl border border-[#269684]/40 bg-[#269684]/10 px-4 py-3 text-[14px] text-[#9fe6d8]">
          <CheckCircle2 size={18} aria-hidden="true" /> Συνδέθηκε ως {user?.email}
        </div>
      </AuthLayout>
    );
  }
  if (state !== 'pending') {
    const text = {
      denied: ['Η σύνδεση απορρίφθηκε', 'Το πρόγραμμα δεν συνδέθηκε. Αν ήταν λάθος, ξεκίνα ξανά από το πρόγραμμα.'],
      expired: ['Το αίτημα έληξε', 'Τα αιτήματα σύνδεσης ισχύουν 10 λεπτά. Πάτα ξανά «Σύνδεση με Google» στο πρόγραμμα.'],
      invalid: ['Ο σύνδεσμος δεν ισχύει', 'Μπορεί να χρησιμοποιήθηκε ήδη. Ξεκίνα ξανά από το πρόγραμμα.'],
    }[state] || ['Ο σύνδεσμος δεν ισχύει', ''];
    return (
      <AuthLayout eyebrow="LASCA για Windows" title={text[0]} subtitle={text[1]}>
        <div className="flex items-center gap-3 text-fog"><XCircle size={18} aria-hidden="true" /> Δεν έγινε καμία αλλαγή στον λογαριασμό σου.</div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout eyebrow="LASCA για Windows" title="Σύνδεση του προγράμματος"
      subtitle="Το πρόγραμμα των Windows ζητάει να συνδεθεί στον λογαριασμό σου."
      footer={<button type="button" onClick={switchAccount} className="l-link">Δεν είσαι {user?.display_name || user?.email}; Άλλος λογαριασμός</button>}>
      <div className="space-y-5">
        <div className="flex items-center gap-3 rounded-xl border border-glass-edge bg-glass-fill px-4 py-3">
          <span className="l-icon-tile h-10 w-10 shrink-0"><Monitor size={18} aria-hidden="true" /></span>
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold text-frost">{info?.device_name}</p>
            <p className="truncate text-[12.5px] text-fog">θα συνδεθεί ως {user?.email}</p>
          </div>
        </div>
        <div>
          <p className="l-label">Ο κωδικός πρέπει να είναι ίδιος με αυτόν στο πρόγραμμα</p>
          <p className="mt-2 rounded-xl border border-[#663af3]/40 bg-[#663af3]/10 py-3 text-center font-mono text-[28px] font-bold tracking-[0.18em] text-white"
            aria-label={`Κωδικός ${info?.user_code?.split('').join(' ')}`}>
            {info?.user_code}
          </p>
        </div>
        <div className="flex gap-2.5 rounded-xl border border-amber-500/25 bg-amber-500/[0.07] px-3.5 py-3 text-[13px] leading-relaxed text-amber-100/90">
          <ShieldAlert size={16} className="mt-0.5 shrink-0 text-amber-300" aria-hidden="true" />
          <span>Ενέκρινε μόνο αν <strong>εσύ</strong> πάτησες «Σύνδεση» στο πρόγραμμα, μόλις τώρα, και ο κωδικός ταιριάζει.
            Αν σου έστειλε κάποιος αυτόν τον σύνδεσμο, πάτα «Δεν το ξεκίνησα εγώ».
            {info?.same_network === false && (
              <strong className="mt-1.5 block text-amber-200">Το αίτημα ήρθε από διαφορετικό δίκτυο από αυτόν τον browser:
                έγκρινε μόνο αν το πρόγραμμα τρέχει μπροστά σου.</strong>
            )}</span>
        </div>
        {error && <div role="alert" className="l-alert l-alert-error">{error}</div>}
        <div className="flex flex-col gap-2.5 sm:flex-row-reverse">
          <button type="button" onClick={() => answer('approve')} disabled={Boolean(busy)} className="l-btn l-btn-primary l-btn-lg flex-1">
            {busy === 'approve' && <Loader2 size={16} className="animate-spin" />} Έγκριση
          </button>
          <button type="button" onClick={() => answer('deny')} disabled={Boolean(busy)} className="l-btn l-btn-ghost l-btn-lg flex-1">
            {busy === 'deny' && <Loader2 size={16} className="animate-spin" />} Δεν το ξεκίνησα εγώ
          </button>
        </div>
      </div>
    </AuthLayout>
  );
}
