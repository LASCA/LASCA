import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  ArrowLeft, ArrowUpRight, Camera, Check, ChevronDown, Copy, Download, FolderOpen, KeyRound, Loader2, LogOut, Mail,
  MonitorSmartphone, Pencil, ShieldCheck, Trash2, Users, X,
} from 'lucide-react';
import { API_BASE_URL } from '../config';
import { apiErrorMessage, useAuth } from '../auth/AuthContext';
import LascaLogo from '../components/brand/LascaLogo';
import PasswordStrength from '../components/ui/PasswordStrength';
import usePageMeta from '../hooks/usePageMeta';

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const ROLE_LABEL = { owner: 'Ιδιοκτήτης', editor: 'Επεξεργαστής', viewer: 'Αναγνώστης' };

// Ίδιο λεξιλόγιο με την εφαρμογή (Dashboard): σκούρες κάρτες, μικροί τίτλοι ενοτήτων, μπλε κουμπί.
const CARD = 'bg-[#0B1221] border border-slate-800/80 rounded-2xl shadow-sm';
const BTN = 'inline-flex items-center justify-center gap-2 h-9 px-4 rounded-xl text-[12px] font-bold tracking-wide transition-all disabled:opacity-50 disabled:cursor-not-allowed';
const BTN_PRIMARY = `${BTN} bg-blue-600 text-white hover:bg-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.2)]`;
const BTN_GHOST = `${BTN} border border-slate-800 bg-transparent text-slate-200 hover:bg-slate-800 hover:border-slate-700`;
const BTN_DANGER = `${BTN} bg-red-600 text-white hover:bg-red-500`;
const INPUT = 'w-full h-10 rounded-xl border border-slate-800 bg-slate-900/70 px-3 text-[13px] text-slate-100 placeholder:text-slate-500 '
  + 'focus:outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20';

function formatDate(iso, withTime = false) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('el-GR', withTime
    ? { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }
    : { day: 'numeric', month: 'short', year: 'numeric' });
}

const SectionTitle = ({ children, right }) => (
  <div className="flex min-h-[38px] items-center justify-between gap-3 mb-2">
    <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em] ml-2">{children}</h3>
    {right}
  </div>
);

function Avatar({ url, name, size = 64 }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [url]);
  const initials = (name || 'U').trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
  if (!url || failed) {
    return (
      <div style={{ width: size, height: size }}
        className="flex items-center justify-center rounded-full bg-slate-800 border border-slate-700 text-lg font-bold text-slate-100">
        {initials}
      </div>
    );
  }
  return <img src={url} alt="" style={{ width: size, height: size }} onError={() => setFailed(true)} className="rounded-full object-cover" />;
}

/** Γραμμή ρυθμίσεων όπως τα κουμπιά του Dashboard: εικονίδιο, τίτλος, υπότιτλος· ανοίγει από κάτω. */
function Row({ icon: Icon, title, subtitle, right, open, onClick, tone, children }) {
  const danger = tone === 'danger';
  return (
    <div className="border-b border-slate-800/60 last:border-0">
      <button type="button" onClick={onClick} aria-expanded={children ? Boolean(open) : undefined}
        className={`group w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${danger ? 'hover:bg-red-500/[0.06]' : 'hover:bg-slate-800/40'}`}>
        <span className={`w-8 h-8 shrink-0 rounded-lg border flex items-center justify-center transition-colors ${danger
          ? 'bg-red-500/10 border-red-500/20 text-red-400'
          : 'bg-slate-900 border-slate-700/70 text-slate-400 group-hover:text-slate-200'}`}>
          <Icon size={15} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className={`block text-[12px] font-bold tracking-wide ${danger ? 'text-red-300' : 'text-slate-200 group-hover:text-white'}`}>{title}</span>
          {subtitle && <span className="block text-[10.5px] mt-0.5 text-slate-500 truncate">{subtitle}</span>}
        </span>
        {right}
        {children !== undefined && (
          <ChevronDown size={15} className={`shrink-0 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
        )}
      </button>
      {open && children && <div className="px-4 pb-4 pt-1 animate-rise">{children}</div>}
    </div>
  );
}

export default function Profile() {
  usePageMeta({ title: 'Προφίλ', noindex: true });
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();
  const fileInput = useRef(null);

  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [school, setSchool] = useState(user?.school || '');
  const [company, setCompany] = useState(user?.company || '');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [openRow, setOpenRow] = useState(null);   // password | 2fa | log
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [projects, setProjects] = useState({ owned: [], shared: [] });
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [tab, setTab] = useState('owned');

  useEffect(() => {
    axios.get(`${API_BASE_URL}/api/me/projects`)
      .then(({ data }) => setProjects({ owned: data.owned || [], shared: data.shared || [] }))
      .catch((err) => toast.error(apiErrorMessage(err, 'Αποτυχία φόρτωσης projects')))
      .finally(() => setProjectsLoading(false));
  }, []);

  useEffect(() => () => { if (avatarPreview) URL.revokeObjectURL(avatarPreview); }, [avatarPreview]);

  const dirty = useMemo(
    () => Boolean(avatarFile) || displayName.trim() !== (user?.display_name || '')
      || school.trim() !== (user?.school || '') || company.trim() !== (user?.company || ''),
    [avatarFile, displayName, school, company, user]
  );

  const pickAvatar = (file) => {
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      toast.error('Επιτρέπονται μόνο εικόνες PNG, JPG ή WEBP');
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toast.error('Η εικόνα πρέπει να είναι μικρότερη από 5MB');
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setIsEditing(true);
  };

  const save = async (e) => {
    e.preventDefault();
    if (!displayName.trim()) {
      toast.error('Το όνομα χρήστη δεν μπορεί να είναι κενό');
      return;
    }
    setSaving(true);
    try {
      const payload = new FormData();
      payload.append('display_name', displayName.trim());
      payload.append('school', school.trim());
      payload.append('company', company.trim());
      if (avatarFile) payload.append('avatar', avatarFile);
      const { data } = await axios.put(`${API_BASE_URL}/api/me`, payload);
      setUser(data);
      setDisplayName(data.display_name);
      setSchool(data.school || '');
      setCompany(data.company || '');
      setAvatarFile(null);
      setAvatarPreview(null);
      setIsEditing(false);
      toast.success('Το προφίλ αποθηκεύτηκε');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Αποτυχία αποθήκευσης'));
    } finally {
      setSaving(false);
    }
  };

  const removeAvatar = async () => {
    try {
      const { data } = await axios.delete(`${API_BASE_URL}/api/me/avatar`);
      setUser(data);
      setAvatarFile(null);
      setAvatarPreview(null);
      toast.success('Η εικόνα αφαιρέθηκε');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Αποτυχία'));
    }
  };

  const cancelEdit = () => {
    setDisplayName(user?.display_name || '');
    setSchool(user?.school || '');
    setCompany(user?.company || '');
    setAvatarFile(null);
    setAvatarPreview(null);
    setIsEditing(false);
  };

  const openProject = (name) => {
    localStorage.setItem(`current_active_project_${user.id}`, name);
    navigate('/app');
  };

  const handleLogout = async () => {
    await logout();
  };

  const logoutEverywhere = async () => {
    if (!window.confirm('Να αποσυνδεθούν όλες οι άλλες συσκευές (browsers και πρόγραμμα Windows);')) return;
    try {
      await axios.post(`${API_BASE_URL}/api/me/logout-all`);
      toast.success('Αποσυνδέθηκαν όλες οι άλλες συσκευές');
    } catch (err) { toast.error(apiErrorMessage(err, 'Αποτυχία')); }
  };

  const toggle = (key) => setOpenRow((v) => (v === key ? null : key));
  const hasPassword = user?.has_password !== false;
  const list = tab === 'owned' ? projects.owned : projects.shared;

  return (
    <div className="h-full overflow-y-auto bg-slate-950 text-slate-200 font-sans">
      <header className="sticky top-0 z-20 h-[72px] bg-[#0b1120] border-b border-slate-800 px-4 sm:px-6 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-4">
          <Link to="/app" aria-label="Πίσω στην εφαρμογή"
            className="w-9 h-9 shrink-0 rounded-xl border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
            <ArrowLeft size={16} aria-hidden="true" />
          </Link>
          <LascaLogo height={24} textClass="text-base" />
          <span className="hidden sm:block h-6 w-px bg-slate-800" aria-hidden="true" />
          <h1 className="hidden sm:block text-[13px] font-bold tracking-wide text-slate-300">Προφίλ</h1>
        </div>
        <button type="button" onClick={handleLogout}
          className="inline-flex items-center gap-2 h-9 px-3 rounded-xl text-[12px] font-bold text-slate-400 hover:text-red-300 hover:bg-red-500/[0.06] transition-colors">
          <LogOut size={15} aria-hidden="true" /> Αποσύνδεση
        </button>
      </header>

      <main id="main" className="mx-auto grid max-w-[1400px] gap-8 px-4 py-6 sm:px-6 lg:grid-cols-[380px_1fr] lg:px-10">
        <div className="flex flex-col gap-6 min-w-0">
          {/* ----- Λογαριασμός ----- */}
          <section aria-labelledby="account-title">
            <SectionTitle><span id="account-title">Λογαριασμός</span></SectionTitle>
            <div className={`${CARD} p-4`}>
              <form onSubmit={save}>
                <div className="flex items-center gap-4">
                  <button type="button" onClick={() => fileInput.current?.click()}
                    className="group relative shrink-0 rounded-full" aria-label="Αλλαγή εικόνας προφίλ" title="Αλλαγή εικόνας">
                    <Avatar url={avatarPreview || user?.avatar_url} name={displayName || user?.display_name} size={64} />
                    <span className="absolute inset-0 flex items-center justify-center rounded-full bg-slate-950/60 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                      <Camera size={17} aria-hidden="true" />
                    </span>
                  </button>
                  <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                    onChange={(e) => { pickAvatar(e.target.files?.[0]); e.target.value = ''; }} aria-label="Επιλογή εικόνας προφίλ" />
                  <div className="min-w-0 flex-1">
                    {isEditing ? (
                      <input id="display_name" value={displayName} maxLength={60} onChange={(e) => setDisplayName(e.target.value)}
                        className={INPUT} autoFocus aria-label="Όνομα χρήστη" />
                    ) : (
                      <p className="truncate text-[15px] font-bold text-white">{user?.display_name || '—'}</p>
                    )}
                    <p className="mt-0.5 truncate text-[12px] text-slate-500" title={user?.email}>{user?.email || '—'}</p>
                    <div className="mt-1.5 flex">
                      <EmailVerificationStatus user={user} />
                    </div>
                  </div>
                  {!isEditing && (
                    <button type="button" onClick={() => setIsEditing(true)} aria-label="Επεξεργασία προφίλ" title="Επεξεργασία"
                      className="w-8 h-8 shrink-0 rounded-lg border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
                      <Pencil size={14} aria-hidden="true" />
                    </button>
                  )}
                </div>
                {isEditing ? (
                  <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Σχολή <span className="normal-case tracking-normal font-normal">(προαιρετικό)</span></span>
                      <input value={school} maxLength={120} onChange={(e) => setSchool(e.target.value)} className={INPUT} placeholder="π.χ. ΑΤΜ ΑΠΘ" />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Εταιρεία <span className="normal-case tracking-normal font-normal">(προαιρετικό)</span></span>
                      <input value={company} maxLength={120} onChange={(e) => setCompany(e.target.value)} className={INPUT} />
                    </label>
                  </div>
                ) : (user?.school || user?.company) && (
                  <dl className="mt-4 grid grid-cols-1 gap-2 border-t border-slate-800/60 pt-3 text-[12px] sm:grid-cols-2">
                    {user?.school && <div className="min-w-0"><dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Σχολή</dt><dd className="truncate text-slate-300">{user.school}</dd></div>}
                    {user?.company && <div className="min-w-0"><dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Εταιρεία</dt><dd className="truncate text-slate-300">{user.company}</dd></div>}
                  </dl>
                )}
                {isEditing && (
                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-800/60 pt-4">
                    <button type="submit" disabled={!dirty || saving} className={BTN_PRIMARY}>
                      {saving && <Loader2 size={14} className="animate-spin" />} Αποθήκευση
                    </button>
                    <button type="button" onClick={cancelEdit} className={BTN_GHOST}>Άκυρο</button>
                    {user?.avatar_url && !avatarPreview && (
                      <button type="button" onClick={removeAvatar} className="ml-auto text-[11px] font-bold text-slate-500 hover:text-red-300">
                        Αφαίρεση εικόνας
                      </button>
                    )}
                  </div>
                )}
              </form>
            </div>
          </section>

          {/* ----- Ασφάλεια ----- */}
          <section aria-labelledby="security-title">
            <SectionTitle><span id="security-title">Ασφάλεια</span></SectionTitle>
            <div className={`${CARD} overflow-hidden`}>
              <Row icon={KeyRound} title={hasPassword ? 'Κωδικός' : 'Ορισμός κωδικού'}
                subtitle={hasPassword ? 'Αλλαγή του κωδικού σύνδεσης' : 'Μπαίνεις με Google· όρισε κωδικό για email και πρόγραμμα Windows'}
                open={openRow === 'password'} onClick={() => toggle('password')}>
                <PasswordForm user={user} setUser={setUser} onDone={() => setOpenRow(null)} />
              </Row>
              <TwoFactorRow user={user} setUser={setUser} open={openRow === '2fa'} onToggle={() => toggle('2fa')} />
              <Row icon={MonitorSmartphone} title="Πρόσφατες συνδέσεις" subtitle="Συνδέσεις και αλλαγές ασφαλείας"
                open={openRow === 'log'} onClick={() => toggle('log')}>
                <SecurityLog />
              </Row>
              <Row icon={LogOut} title="Αποσύνδεση από άλλες συσκευές" subtitle="Browsers και πρόγραμμα Windows" onClick={logoutEverywhere} />
              <Row icon={Trash2} tone="danger" title="Διαγραφή λογαριασμού" subtitle="Οριστική διαγραφή του λογαριασμού σου"
                onClick={() => setDeleteOpen(true)} />
            </div>
          </section>
        </div>

        {/* ----- Projects ----- */}
        <section className="min-w-0" aria-labelledby="projects-title">
          <SectionTitle right={(
            <div role="tablist" aria-label="Projects" className="inline-flex rounded-xl border border-slate-800 bg-[#0B1221] p-1">
              {[
                ['owned', 'Δικά μου', projects.owned.length],
                ['shared', 'Κοινά', projects.shared.length],
              ].map(([key, label, count]) => (
                <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)}
                  className={`h-7 inline-flex items-center gap-2 rounded-lg px-3 text-[11px] font-bold transition-colors ${tab === key
                    ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-200'}`}>
                  {label}
                  <span className={`rounded-md px-1.5 text-[10px] ${tab === key ? 'bg-blue-600/30 text-blue-200' : 'bg-slate-800/70 text-slate-500'}`}>{count}</span>
                </button>
              ))}
            </div>
          )}>
            <span id="projects-title">Τα projects μου</span>
          </SectionTitle>

          <div role="tabpanel">
            {projectsLoading ? (
              <div className={`${CARD} flex items-center justify-center gap-2 py-16 text-[12px] text-slate-500`}>
                <Loader2 size={15} className="animate-spin" /> Φόρτωση...
              </div>
            ) : list.length === 0 ? (
              <div className={`${CARD} py-16 text-center`}>
                <FolderOpen size={26} strokeWidth={1.5} className="mx-auto text-slate-600" aria-hidden="true" />
                <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-600">
                  {tab === 'owned' ? 'Δεν έχεις δημιουργήσει ακόμα project' : 'Κανείς δεν έχει κοινοποιήσει project σε εσένα'}
                </p>
              </div>
            ) : (
              <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
                {list.map((p) => (
                  <li key={p.public_id || p.name}>
                    <button type="button" onClick={() => openProject(p.name)}
                      className={`${CARD} group w-full p-4 text-left transition-all hover:border-slate-700 hover:bg-[#0e1628]`}>
                      <div className="flex min-w-0 items-start gap-3">
                        <span className={`w-8 h-8 shrink-0 rounded-lg border flex items-center justify-center ${tab === 'shared'
                          ? 'bg-violet-500/10 border-violet-500/20 text-violet-300' : 'bg-blue-500/10 border-blue-500/20 text-blue-300'}`}>
                          {tab === 'shared' ? <Users size={15} aria-hidden="true" /> : <FolderOpen size={15} aria-hidden="true" />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-bold tracking-wide text-slate-200 group-hover:text-white">{p.name}</p>
                          <p className="mt-0.5 truncate text-[10.5px] text-slate-500">
                            {tab === 'shared' && p.owner_name ? `Από ${p.owner_name} · ` : ''}
                            Αλλαγή {formatDate(p.updated_at || p.created_at)}
                            {p.updated_by?.display_name && p.updated_by.id !== user?.id ? ` από ${p.updated_by.display_name}` : ''}
                          </p>
                        </div>
                        <ArrowUpRight size={14} className="shrink-0 text-slate-600 transition-colors group-hover:text-slate-300" aria-hidden="true" />
                      </div>
                      {(tab === 'shared' || p.members_count > 1) && (
                        <div className="mt-3 flex gap-1.5 pl-11">
                          {tab === 'shared' && (
                            <span className="rounded-md border border-slate-800 bg-slate-900 px-2 py-0.5 text-[10px] font-bold text-slate-400">{ROLE_LABEL[p.role] || p.role}</span>
                          )}
                          {p.members_count > 1 && (
                            <span className="inline-flex items-center gap-1 rounded-md border border-slate-800 bg-slate-900 px-2 py-0.5 text-[10px] font-bold text-slate-400">
                              <Users size={10} aria-hidden="true" /> {p.members_count}
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </main>

      <DeleteAccountDialog open={deleteOpen} onClose={() => setDeleteOpen(false)} user={user}
        onDeleted={() => { setUser(null); navigate('/', { replace: true }); }} />
    </div>
  );
}

// --- Έλεγχος δύο βημάτων ---
function TwoFactorRow({ user, setUser, open, onToggle }) {
  const [status, setStatus] = useState(null);
  const [mode, setMode] = useState(null);         // null | 'choose' | 'totp' | 'email'
  const [setup, setSetup] = useState(null);       // { secret, qr } για εφαρμογή authenticator
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [codes, setCodes] = useState(null);       // εφεδρικοί κωδικοί (εμφανίζονται μία φορά)
  const [manage, setManage] = useState(null);     // null | 'disable' | 'regenerate'
  const [busy, setBusy] = useState(false);
  const hasPassword = user?.has_password !== false;

  useEffect(() => {
    axios.get(`${API_BASE_URL}/api/me/2fa`).then(({ data }) => setStatus(data)).catch(() => setStatus({ enabled: false }));
  }, []);

  const reset = () => { setMode(null); setSetup(null); setPassword(''); setCode(''); setManage(null); };
  const run = async (fn) => { setBusy(true); try { await fn(); } catch (err) { toast.error(apiErrorMessage(err)); } finally { setBusy(false); } };

  // Βήμα 1: επιβεβαίωση κωδικού λογαριασμού (ένα κλεμμένο cookie δεν αρκεί για να αλλάξει το 2FA)
  const start = (e) => {
    e.preventDefault();
    run(async () => {
      if (mode === 'totp') {
        const { data } = await axios.post(`${API_BASE_URL}/api/me/2fa/setup`, { password });
        setSetup(data);
      } else {
        const { data } = await axios.post(`${API_BASE_URL}/api/me/2fa/email/setup`, { password });
        setSetup({ email: data.email_hint });
        toast.success(`Στείλαμε κωδικό στο ${data.email_hint}`);
      }
      setCode('');
    });
  };

  const enable = (e) => {
    e.preventDefault();
    run(async () => {
      const url = mode === 'totp' ? '/api/me/2fa/enable' : '/api/me/2fa/email/enable';
      try {
        const { data } = await axios.post(`${API_BASE_URL}${url}`, { code });
        setCodes(data.backup_codes);
        setStatus(data);
        reset();
        setUser({ ...user, two_factor_enabled: true });
        toast.success('Ο έλεγχος δύο βημάτων ενεργοποιήθηκε. Οι άλλες συσκευές θα ζητήσουν ξανά σύνδεση.');
      } catch (err) { setCode(''); throw err; }
    });
  };

  const sendManageCode = () => run(async () => {
    const { data } = await axios.post(`${API_BASE_URL}/api/me/2fa/send-code`);
    toast.success(`Στείλαμε κωδικό στο ${data.email_hint}`);
  });

  const submitManage = (e) => {
    e.preventDefault();
    run(async () => {
      if (manage === 'disable') {
        const { data } = await axios.post(`${API_BASE_URL}/api/me/2fa/disable`, { password, code });
        setStatus(data);
        setUser({ ...user, two_factor_enabled: false });
        toast.success('Ο έλεγχος δύο βημάτων απενεργοποιήθηκε');
      } else {
        const { data } = await axios.post(`${API_BASE_URL}/api/me/2fa/backup-codes`, { code });
        setCodes(data.backup_codes);
        setStatus(data);
      }
      reset();
    });
  };

  const copyCodes = async () => {
    try { await navigator.clipboard.writeText(codes.join('\n')); toast.success('Αντιγράφηκαν'); } catch { toast.error('Η αντιγραφή απέτυχε'); }
  };
  const downloadCodes = () => {
    const blob = new Blob([`Εφεδρικοί κωδικοί LASCA (${user.email})\nΚάθε κωδικός ισχύει μία φορά.\n\n${codes.join('\n')}\n`], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'lasca-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const emailMethod = status?.method === 'email';
  const codeInput = (
    <input value={code} onChange={(e) => setCode(e.target.value)} placeholder={emailMethod || mode === 'email' ? 'Κωδικός από το email' : 'Κωδικός εφαρμογής'}
      autoComplete="one-time-code" className={INPUT} required aria-label="Κωδικός δύο βημάτων" maxLength={11} />
  );
  const badge = (
    <span className={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-bold ${status?.enabled
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-slate-700 bg-slate-900 text-slate-400'}`}>
      {status === null ? '…' : status.enabled ? 'Ενεργός' : 'Ανενεργός'}
    </span>
  );
  const opt = 'w-full rounded-xl border border-slate-800 p-3 text-left transition-colors hover:bg-slate-800 hover:border-slate-700 disabled:opacity-50 disabled:hover:bg-transparent';

  return (
    <Row icon={ShieldCheck} title="Έλεγχος δύο βημάτων" subtitle="Δεύτερος κωδικός σε κάθε σύνδεση" right={badge}
      open={open || Boolean(codes)} onClick={onToggle}>
      {codes ? (
        <div className="space-y-3">
          <p className="rounded-xl border border-blue-500/25 bg-blue-500/[0.07] px-3 py-2 text-[12px] leading-relaxed text-blue-100">
            Αποθήκευσε αυτούς τους κωδικούς κάπου ασφαλές. Αν χάσεις το κινητό ή την πρόσβαση στο email σου, θα μπεις μόνο με αυτούς. <strong>Δεν θα τους ξαναδείς.</strong>
          </p>
          <ul className="grid grid-cols-2 gap-2 rounded-xl border border-slate-800 bg-slate-900/70 p-3 font-mono text-[13px] text-slate-100">
            {codes.map((c) => <li key={c}>{c}</li>)}
          </ul>
          <div className="flex gap-2">
            <button type="button" onClick={copyCodes} className={`${BTN_GHOST} flex-1`}><Copy size={14} /> Αντιγραφή</button>
            <button type="button" onClick={downloadCodes} className={`${BTN_GHOST} flex-1`}><Download size={14} /> Λήψη .txt</button>
          </div>
          <button type="button" onClick={() => setCodes(null)} className={`${BTN_PRIMARY} w-full`}>Τους αποθήκευσα</button>
        </div>
      ) : status === null ? (
        <Loader2 size={15} className="animate-spin text-slate-500" />
      ) : status.enabled ? (
        <div className="space-y-3">
          <p className="text-[12px] text-emerald-300">
            {emailMethod ? 'Κωδικός στο email' : 'Εφαρμογή authenticator'} · {status.backup_codes_left} εφεδρικοί κωδικοί
          </p>
          {!manage ? (
            <div className="flex gap-2">
              <button type="button" onClick={() => setManage('regenerate')} className={`${BTN_GHOST} flex-1`}>Νέοι εφεδρικοί</button>
              <button type="button" onClick={() => setManage('disable')} className={`${BTN_GHOST} flex-1 hover:!text-red-300`}>Απενεργοποίηση</button>
            </div>
          ) : (
            <form onSubmit={submitManage} className="space-y-2.5">
              {manage === 'disable' && hasPassword && (
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Ο κωδικός του λογαριασμού" autoComplete="current-password" className={INPUT} required aria-label="Ο κωδικός του λογαριασμού" />
              )}
              {codeInput}
              {emailMethod && <button type="button" onClick={sendManageCode} disabled={busy} className="text-[11px] font-bold text-slate-400 hover:text-white">Αποστολή κωδικού στο email</button>}
              <div className="flex gap-2">
                <button type="button" onClick={reset} className={`${BTN_GHOST} flex-1`}>Άκυρο</button>
                <button type="submit" disabled={busy} className={`${manage === 'disable' ? BTN_DANGER : BTN_PRIMARY} flex-1`}>
                  {busy && <Loader2 size={14} className="animate-spin" />} {manage === 'disable' ? 'Απενεργοποίηση' : 'Δημιουργία'}
                </button>
              </div>
            </form>
          )}
        </div>
      ) : !mode ? (
        <div className="space-y-3">
          <p className="text-[12px] leading-relaxed text-slate-400">Ακόμα κι αν κάποιος μάθει τον κωδικό σου, δεν θα μπορεί να μπει χωρίς τον δεύτερο κωδικό.</p>
          <button type="button" onClick={() => setMode('choose')} className={`${BTN_PRIMARY} w-full`}>Ενεργοποίηση</button>
        </div>
      ) : mode === 'choose' ? (
        <div className="space-y-2">
          <button type="button" onClick={() => setMode('totp')} className={opt}>
            <p className="text-[12px] font-bold text-slate-200">Εφαρμογή authenticator <span className="ml-1 rounded-md bg-blue-600/25 px-1.5 py-px text-[10px] text-blue-200">Προτείνεται</span></p>
            <p className="mt-0.5 text-[11px] text-slate-500">Google / Microsoft Authenticator, Authy, 1Password. Η πιο ασφαλής επιλογή.</p>
          </button>
          <button type="button" onClick={() => setMode('email')} disabled={!status.email_available || !user?.email_verified} className={opt}>
            <p className="text-[12px] font-bold text-slate-200">Κωδικός στο email</p>
            <p className="mt-0.5 text-[11px] text-slate-500">{user?.email_verified ? 'Σε κάθε σύνδεση στέλνουμε κωδικό 6 ψηφίων στο email σου.' : 'Επιβεβαίωσε πρώτα το email σου.'}</p>
          </button>
          <button type="button" onClick={reset} className="w-full py-1 text-[11px] font-bold text-slate-500 hover:text-white">Άκυρο</button>
        </div>
      ) : !setup ? (
        <form onSubmit={start} className="space-y-2.5">
          <p className="text-[12px] text-slate-400">{hasPassword ? 'Για ασφάλεια, γράψε τον κωδικό του λογαριασμού σου.' : 'Επιβεβαίωσε ότι είσαι εσύ (σύνδεση με Google τα τελευταία 10 λεπτά).'}</p>
          {hasPassword && (
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Κωδικός λογαριασμού" autoComplete="current-password" className={INPUT} required autoFocus aria-label="Κωδικός λογαριασμού" />
          )}
          <div className="flex gap-2">
            <button type="button" onClick={reset} className={`${BTN_GHOST} flex-1`}>Άκυρο</button>
            <button type="submit" disabled={busy} className={`${BTN_PRIMARY} flex-1`}>{busy && <Loader2 size={14} className="animate-spin" />} Συνέχεια</button>
          </div>
        </form>
      ) : (
        <form onSubmit={enable} className="space-y-3">
          {mode === 'totp' ? (
            <>
              <ol className="space-y-1.5 text-[12px] text-slate-400 [&>li]:ml-4 [&>li]:list-decimal">
                <li>Άνοιξε μια εφαρμογή authenticator (Google Authenticator, Microsoft Authenticator, Authy, 1Password…).</li>
                <li>Σκάναρε τον κωδικό QR ή γράψε το κλειδί.</li>
                <li>Γράψε τον 6ψήφιο κωδικό που εμφανίζεται.</li>
              </ol>
              {setup.qr && <img src={setup.qr} alt="Κωδικός QR για την εφαρμογή authenticator" className="mx-auto h-40 w-40 rounded-xl bg-white p-2" />}
              <p className="break-all rounded-lg border border-slate-800 bg-slate-900/70 p-2 text-center font-mono text-[12px] tracking-wider text-slate-200" aria-label="Κλειδί για χειροκίνητη εισαγωγή">{setup.secret.match(/.{1,4}/g).join(' ')}</p>
            </>
          ) : (
            <p className="text-[12px] text-slate-400">Γράψε τον κωδικό που στείλαμε στο {setup.email}.</p>
          )}
          <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} inputMode="numeric" maxLength={6}
            autoComplete="one-time-code" placeholder="000000" className={`${INPUT} text-center font-mono text-lg tracking-[0.4em]`} aria-label="Κωδικός 6 ψηφίων" required />
          <div className="flex gap-2">
            <button type="button" onClick={reset} className={`${BTN_GHOST} flex-1`}>Άκυρο</button>
            <button type="submit" disabled={busy || code.length !== 6} className={`${BTN_PRIMARY} flex-1`}>{busy && <Loader2 size={14} className="animate-spin" />} Ενεργοποίηση</button>
          </div>
        </form>
      )}
    </Row>
  );
}

// --- Κατάσταση επιβεβαίωσης email ---
function EmailVerificationStatus({ user }) {
  const [sent, setSent] = useState(false);
  if (!user) return null;
  const resend = async () => {
    try { await axios.post(`${API_BASE_URL}/api/me/verify-email`); setSent(true); } catch (err) { toast.error(apiErrorMessage(err)); }
  };
  if (user.email_verified) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-emerald-500/25 bg-emerald-500/10 px-1.5 py-px text-[10px] font-bold text-emerald-300" role="status">
        <Check size={10} aria-hidden="true" /> Επιβεβαιωμένο
      </span>
    );
  }
  return (
    <button type="button" onClick={resend} disabled={sent}
      className="inline-flex shrink-0 items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-1.5 py-px text-[10px] font-bold text-amber-300 hover:bg-amber-500/20 disabled:opacity-70">
      {sent ? <Check size={10} aria-hidden="true" /> : <Mail size={10} aria-hidden="true" />}
      {sent ? 'Στάλθηκε' : 'Επιβεβαίωση email'}
    </button>
  );
}

// --- Αλλαγή / ορισμός κωδικού ---
function PasswordForm({ user, setUser, onDone }) {
  const { passwordMin, passwordRecommended } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirmNext, setConfirmNext] = useState('');
  const [valid, setValid] = useState(false);
  const [busy, setBusy] = useState(false);
  const hasPassword = user?.has_password !== false;

  const changePassword = async (e) => {
    e.preventDefault();
    if (!valid) return toast.error('Ο νέος κωδικός δεν είναι αρκετά ισχυρός');
    if (next !== confirmNext) return toast.error('Οι κωδικοί δεν ταιριάζουν');
    setBusy(true);
    try {
      const { data } = await axios.post(`${API_BASE_URL}/api/me/password`, { current_password: current, new_password: next });
      setUser(data);
      setCurrent(''); setNext(''); setConfirmNext('');
      onDone();
      toast.success(hasPassword ? 'Ο κωδικός άλλαξε. Οι άλλες συσκευές αποσυνδέθηκαν.' : 'Ο κωδικός ορίστηκε. Μπορείς πλέον να μπαίνεις και από το πρόγραμμα των Windows.');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Αποτυχία αλλαγής κωδικού'));
    } finally { setBusy(false); }
  };

  return (
    <form onSubmit={changePassword} className="space-y-2.5">
      {hasPassword && (
        <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="Τρέχων κωδικός" aria-label="Τρέχων κωδικός" autoComplete="current-password" className={INPUT} required autoFocus />
      )}
      <input type="password" value={next} onChange={(e) => setNext(e.target.value)} placeholder="Νέος κωδικός" aria-label="Νέος κωδικός" autoComplete="new-password" className={INPUT} required maxLength={128} aria-describedby="new-pw-strength" />
      <PasswordStrength id="new-pw-strength" password={next} email={user?.email} name={user?.display_name} min={passwordMin} recommended={passwordRecommended} onValidity={setValid} />
      <input type="password" value={confirmNext} onChange={(e) => setConfirmNext(e.target.value)} placeholder="Επιβεβαίωση νέου κωδικού" aria-label="Επιβεβαίωση νέου κωδικού" autoComplete="new-password" className={INPUT} required maxLength={128} />
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onDone} className={`${BTN_GHOST} flex-1`}>Άκυρο</button>
        <button type="submit" disabled={busy} className={`${BTN_PRIMARY} flex-1`}>{busy && <Loader2 size={14} className="animate-spin" />} Αποθήκευση</button>
      </div>
    </form>
  );
}

// --- Πρόσφατη δραστηριότητα ασφαλείας ---
function SecurityLog() {
  const [events, setEvents] = useState(null);
  useEffect(() => {
    axios.get(`${API_BASE_URL}/api/me/security-events`).then(({ data }) => setEvents(data.events || [])).catch(() => setEvents([]));
  }, []);
  const bad = (e) => /failed|blocked/.test(e.event);
  if (events === null) return <Loader2 size={15} className="animate-spin text-slate-500" />;
  return (
    <ul className="max-h-72 space-y-2.5 overflow-y-auto pr-1">
      {events.length === 0 && <li className="text-[12px] text-slate-500">Δεν υπάρχει δραστηριότητα.</li>}
      {events.map((e, i) => (
        <li key={i} className="flex items-start justify-between gap-3 text-[12px]">
          <div className="min-w-0">
            <p className={bad(e) ? 'text-red-300' : 'text-slate-200'}>{e.label}</p>
            <p className="truncate text-[11px] text-slate-500">{[e.client, e.ip].filter(Boolean).join(' · ')}</p>
          </div>
          <time className="shrink-0 text-[11px] text-slate-500" dateTime={e.at}>{formatDate(e.at, true)}</time>
        </li>
      ))}
    </ul>
  );
}

// --- Διαγραφή λογαριασμού ---
function DeleteAccountDialog({ open, onClose, user, onDeleted }) {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const hasPassword = user?.has_password !== false;

  useEffect(() => {
    if (!open) { setPassword(''); return undefined; }
    const esc = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [open, onClose]);

  if (!open) return null;

  const remove = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await axios.delete(`${API_BASE_URL}/api/me`, { data: { password, confirm: 'ΔΙΑΓΡΑΦΗ' } });
      const moved = data.transferred?.length ? ` Τα κοινά projects (${data.transferred.join(', ')}) πέρασαν στους συνεργάτες σου.` : '';
      toast.success(`Ο λογαριασμός διαγράφηκε.${moved}`, { duration: 7000 });
      onDeleted();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Αποτυχία διαγραφής'));
    } finally { setBusy(false); }
  };

  return createPortal(
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className={`${CARD} w-full max-w-md p-5 shadow-2xl animate-pop`} role="dialog" aria-modal="true" aria-labelledby="delete-account-title">
        <div className="flex items-start gap-3">
          <span className="w-9 h-9 shrink-0 rounded-lg border border-red-500/25 bg-red-500/10 flex items-center justify-center text-red-400">
            <Trash2 size={16} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="delete-account-title" className="text-[14px] font-bold text-white">Διαγραφή λογαριασμού</h2>
            <p className="mt-1 text-[12px] leading-relaxed text-slate-400">
              Σβήνονται ο λογαριασμός, η εικόνα σου, το ιστορικό ασφαλείας και τα projects που έχεις μόνο εσύ. Όσα projects έχουν
              κι άλλα μέλη δεν χάνονται: περνάνε στον πρώτο συνεργάτη.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Κλείσιμο" className="rounded-lg p-1 text-slate-500 hover:bg-slate-800 hover:text-white"><X size={15} /></button>
        </div>
        <form onSubmit={remove} className="mt-4 space-y-3">
          {hasPassword && (
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Ο κωδικός σου" aria-label="Ο κωδικός σου" className={INPUT} required autoFocus />
          )}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className={`${BTN_GHOST} flex-1`}>Ακύρωση</button>
            <button type="submit" disabled={busy || (hasPassword && !password)} className={`${BTN_DANGER} flex-1`}>
              {busy && <Loader2 size={14} className="animate-spin" />} Οριστική διαγραφή
            </button>
          </div>
        </form>
      </section>
    </div>,
    document.body
  );
}
