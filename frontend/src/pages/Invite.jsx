import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Loader2, Users } from 'lucide-react';
import { API_BASE_URL } from '../config';
import { apiErrorMessage, useAuth } from '../auth/AuthContext';
import AuthLayout from '../components/auth/AuthLayout';

// Σελίδα συνδέσμου πρόσκλησης: /invite/<token>
export default function Invite() {
  const { token } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [info, setInfo] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    setLoading(true);
    axios.get(`${API_BASE_URL}/api/invites/${encodeURIComponent(token)}`)
      .then(({ data }) => setInfo(data))
      .catch((err) => setError(apiErrorMessage(err, 'Ο σύνδεσμος δεν ισχύει.')))
      .finally(() => setLoading(false));
  }, [token, authLoading, user?.id]);

  const openInApp = (projectName) => {
    localStorage.setItem(`current_active_project_${user.id}`, projectName);
    navigate('/app', { replace: true });
  };

  const accept = async () => {
    setJoining(true);
    try {
      const { data } = await axios.post(`${API_BASE_URL}/api/invites/${encodeURIComponent(token)}/accept`);
      toast.success(data.joined ? `Μπήκες στο project «${data.project.name}»` : 'Είσαι ήδη μέλος του project');
      openInApp(data.project.name);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Αποτυχία'));
      setJoining(false);
    }
  };

  const from = { from: `/invite/${token}` };

  return (
    <AuthLayout title="Πρόσκληση σε project" subtitle={info ? `από ${info.owner?.display_name || 'έναν χρήστη'}` : undefined}>
      {loading || authLoading ? (
        <div className="flex items-center gap-2 text-sm text-slate-400"><Loader2 size={16} className="animate-spin" /> Φόρτωση...</div>
      ) : error ? (
        <div className="space-y-4">
          <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-3 text-sm text-rose-200">{error}</div>
          <p className="text-sm text-slate-400">Ζήτα από τον ιδιοκτήτη του project έναν νέο σύνδεσμο.</p>
          <Link to={user ? '/app' : '/'} className="inline-block text-sm font-bold text-slate-100 hover:underline">
            {user ? 'Στην εφαρμογή' : 'Στην αρχική'}
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
            <p className="text-lg font-bold text-slate-50">{info.project.name}</p>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-400">
              <Users size={14} /> {info.project.members_count} {info.project.members_count === 1 ? 'μέλος' : 'μέλη'}
            </p>
            <p className="mt-3 text-sm text-slate-300">
              Θα μπεις ως <span className="font-bold">{info.role_label}</span>
              {info.role === 'viewer' ? ': θα βλέπεις τα δεδομένα χωρίς να τα αλλάζεις.' : ': θα βλέπεις και θα αλλάζεις τα δεδομένα.'}
            </p>
          </div>

          {user ? (
            info.already_member ? (
              <button type="button" onClick={() => openInApp(info.project.name)}
                className="w-full h-11 rounded-xl bg-slate-100 text-sm font-bold text-slate-900 hover:bg-white">
                Είσαι ήδη μέλος · Άνοιγμα project
              </button>
            ) : (
              <button type="button" onClick={accept} disabled={joining}
                className="w-full h-11 rounded-xl bg-gradient-to-r from-[#d93a44] to-[#3b5bdb] text-sm font-bold text-white hover:brightness-110 disabled:opacity-60 flex items-center justify-center gap-2">
                {joining && <Loader2 size={16} className="animate-spin" />} Αποδοχή πρόσκλησης
              </button>
            )
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-slate-400">Για να μπεις στο project χρειάζεσαι λογαριασμό LASCA.</p>
              <Link to="/signup" state={from}
                className="w-full h-11 rounded-xl bg-gradient-to-r from-[#d93a44] to-[#3b5bdb] text-sm font-bold text-white hover:brightness-110 flex items-center justify-center">
                Δημιουργία λογαριασμού
              </Link>
              <Link to="/login" state={from}
                className="w-full h-11 rounded-xl border border-slate-700 text-sm font-bold text-slate-100 hover:bg-slate-800 flex items-center justify-center">
                Έχω ήδη λογαριασμό
              </Link>
            </div>
          )}
        </div>
      )}
    </AuthLayout>
  );
}
