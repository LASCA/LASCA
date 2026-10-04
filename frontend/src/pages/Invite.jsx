import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Loader2, Users } from 'lucide-react';
import { API_BASE_URL } from '../config';
import { apiErrorMessage, useAuth } from '../auth/AuthContext';
import AuthLayout from '../components/auth/AuthLayout';
import usePageMeta from '../hooks/usePageMeta';

// Σελίδα συνδέσμου πρόσκλησης: /invite/<token>
export default function Invite() {
  usePageMeta({ title: 'Πρόσκληση σε project', noindex: true });
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
    <AuthLayout eyebrow="Πρόσκληση" title="Πρόσκληση σε project" subtitle={info ? `από ${info.owner?.display_name || 'έναν χρήστη'}` : undefined}>
      {loading || authLoading ? (
        <div className="flex items-center gap-2 text-sm text-fog" role="status"><Loader2 size={16} className="animate-spin" /> Φόρτωση...</div>
      ) : error ? (
        <div className="space-y-4">
          <div role="alert" className="l-alert l-alert-error">{error}</div>
          <p className="text-sm text-fog">Ζήτα από τον ιδιοκτήτη του project έναν νέο σύνδεσμο.</p>
          <Link to={user ? '/app' : '/'} className="l-link text-sm">
            {user ? 'Στην εφαρμογή' : 'Στην αρχική'}
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="l-card p-5">
            <p className="text-lg font-semibold text-ice">{info.project.name}</p>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-fog">
              <Users size={14} /> {info.project.members_count} {info.project.members_count === 1 ? 'μέλος' : 'μέλη'}
            </p>
            <p className="mt-3 text-sm text-mist">
              Θα μπεις ως <span className="font-semibold text-frost">{info.role_label}</span>
              {info.role === 'viewer' ? ': θα βλέπεις τα δεδομένα χωρίς να τα αλλάζεις.' : ': θα βλέπεις και θα αλλάζεις τα δεδομένα.'}
            </p>
          </div>

          {user ? (
            info.already_member ? (
              <button type="button" onClick={() => openInApp(info.project.name)}
                className="l-btn l-btn-ghost l-btn-lg w-full">
                Είσαι ήδη μέλος · Άνοιγμα project
              </button>
            ) : (
              <button type="button" onClick={accept} disabled={joining}
                className="l-btn l-btn-primary l-btn-lg w-full">
                {joining && <Loader2 size={16} className="animate-spin" />} Αποδοχή πρόσκλησης
              </button>
            )
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-fog">Για να μπεις στο project χρειάζεσαι λογαριασμό LASCA.</p>
              <Link to="/signup" state={from}
                className="l-btn l-btn-primary l-btn-lg w-full">
                Δημιουργία λογαριασμού
              </Link>
              <Link to="/login" state={from}
                className="l-btn l-btn-outline l-btn-lg w-full">
                Έχω ήδη λογαριασμό
              </Link>
            </div>
          )}
        </div>
      )}
    </AuthLayout>
  );
}
