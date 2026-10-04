import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Camera, Copy, Download, FolderOpen, KeyRound, Loader2, LogOut, MonitorSmartphone, ShieldAlert,
  ShieldCheck, Trash2, Users,
} from 'lucide-react';
import { API_BASE_URL } from '../config';
import { apiErrorMessage, useAuth } from '../auth/AuthContext';
import LascaLogo from '../components/brand/LascaLogo';
import PasswordStrength from '../components/ui/PasswordStrength';
import usePageMeta from '../hooks/usePageMeta';

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const ROLE_LABEL = { owner: 'Ιδιοκτήτης', editor: 'Επεξεργαστής', viewer: 'Αναγνώστης' };

function formatDate(iso, withTime = false) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('el-GR', withTime
    ? { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }
    : { day: 'numeric', month: 'short', year: 'numeric' });
}

function Avatar({ url, name, size = 96 }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [url]);
  const initials = (name || 'U').trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
  if (!url || failed) {
    return (
      <div style={{ width: size, height: size }}
        className="flex items-center justify-center rounded-full bg-gradient-to-br from-[#4b2bc4] to-[#1d4f8f] text-2xl font-semibold text-white shadow-[var(--shadow-hairline)]">
        {initials}
      </div>
    );
  }
  return <img src={url} alt="" style={{ width: size, height: size }} onError={() => setFailed(true)}
    className="rounded-full object-cover" />;
}

function Card({ title, icon: Icon, children, tone }) {
  return (
    <section className={`l-card p-6 ${tone === 'danger' ? '!bg-[rgb(228_109_76/0.04)] shadow-[inset_0_0_0_1px_rgb(228_109_76/0.25)]' : ''}`}>
      {title && (
        <h2 className={`flex items-center gap-2 text-[15px] font-semibold ${tone === 'danger' ? 'text-[#ffcfc2]' : 'text-ice'}`}>
          {Icon && <Icon size={17} aria-hidden="true" />} {title}
        </h2>
      )}
      {children}
    </section>
  );
}

export default function Profile() {
  usePageMeta({ title: 'Προφίλ', noindex: true });
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();
  const fileInput = useRef(null);

  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [saving, setSaving] = useState(false);

  const [projects, setProjects] = useState({ owned: [], shared: [], stats: null });
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [tab, setTab] = useState('owned');

  useEffect(() => {
    axios.get(`${API_BASE_URL}/api/me/projects`)
      .then(({ data }) => setProjects({ owned: data.owned || [], shared: data.shared || [], stats: data.stats || null }))
      .catch((err) => toast.error(apiErrorMessage(err, 'Αποτυχία φόρτωσης projects')))
      .finally(() => setProjectsLoading(false));
  }, []);

  useEffect(() => () => { if (avatarPreview) URL.revokeObjectURL(avatarPreview); }, [avatarPreview]);

  const dirty = useMemo(
    () => Boolean(avatarFile) || displayName.trim() !== (user?.display_name || ''),
    [avatarFile, displayName, user]
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
      if (avatarFile) payload.append('avatar', avatarFile);
      const { data } = await axios.put(`${API_BASE_URL}/api/me`, payload);
      setUser(data);
      setDisplayName(data.display_name);
      setAvatarFile(null);
      setAvatarPreview(null);
      toast.success('Το προφίλ αποθηκεύτηκε');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Αποτυχία αποθήκευσης'));
    } finally {
      setSaving(false);
    }
  };

  const openProject = (name) => {
    localStorage.setItem(`current_active_project_${user.id}`, name);
    navigate('/app');
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

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  const list = tab === 'owned' ? projects.owned : projects.shared;

  return (
    <div className="relative h-full overflow-y-auto bg-canvas text-frost">
      <div aria-hidden="true" className="l-grid-bg pointer-events-none absolute inset-x-0 top-0 h-[520px]" />
      <header className="sticky top-0 z-20 bg-canvas/80 backdrop-blur-xl shadow-[inset_0_-1px_0_rgb(186_215_247/0.1)]">
        <div className="mx-auto flex h-16 max-w-[1100px] items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link to="/app" className="l-btn l-btn-outline l-btn-sm">
              <ArrowLeft size={15} aria-hidden="true" /> <span className="hidden sm:inline">Πίσω στην εφαρμογή</span><span className="sm:hidden">Πίσω</span>
            </Link>
            <span className="hidden sm:inline-flex"><LascaLogo height={26} textClass="text-lg" /></span>
          </div>
          <button onClick={handleLogout} className="l-btn l-btn-sm text-[#ffb8a3] hover:bg-[rgb(228_109_76/0.1)]">
            <LogOut size={15} aria-hidden="true" /> Αποσύνδεση
          </button>
        </div>
      </header>

      <div className="relative mx-auto max-w-[1100px] px-4 pt-6 sm:px-6"><VerifyEmailBanner user={user} /></div>
      <main id="main" className="relative mx-auto grid max-w-[1100px] gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[340px_1fr]">
        <div className="h-fit space-y-6">
          <form onSubmit={save} className="l-card h-fit p-6">
            <div className="flex flex-col items-center text-center">
              <button type="button" onClick={() => fileInput.current?.click()}
                className="group relative rounded-full" aria-label="Αλλαγή εικόνας προφίλ">
                <Avatar url={avatarPreview || user?.avatar_url} name={displayName || user?.display_name} size={104} />
                <span className="absolute inset-0 flex items-center justify-center rounded-full bg-canvas/60 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                  <Camera size={22} className="text-white" aria-hidden="true" />
                </span>
              </button>
              <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                onChange={(e) => { pickAvatar(e.target.files?.[0]); e.target.value = ''; }} aria-label="Επιλογή εικόνας προφίλ" />
              <p className="mt-3 text-[12.5px] text-fog">PNG, JPG ή WEBP, έως 5MB · κόβεται τετράγωνη</p>
              {user?.avatar_url && !avatarPreview && (
                <button type="button" onClick={removeAvatar} className="mt-1 text-[12.5px] text-fog hover:text-[#ffb8a3]">Αφαίρεση εικόνας</button>
              )}
            </div>
            <div className="mt-6 space-y-1.5">
              <label htmlFor="display_name" className="l-label">Όνομα χρήστη</label>
              <input id="display_name" value={displayName} maxLength={60} onChange={(e) => setDisplayName(e.target.value)} className="l-input" />
            </div>
            <div className="mt-4 space-y-1">
              <p className="l-label">Email</p>
              <p className="truncate text-[14px] text-mist" title={user?.email}>{user?.email}</p>
            </div>
            <button type="submit" disabled={!dirty || saving} className="l-btn l-btn-primary mt-6 w-full">
              {saving && <Loader2 size={16} className="animate-spin" />} Αποθήκευση αλλαγών
            </button>
          </form>
          <TwoFactorCard user={user} setUser={setUser} />
          <PasswordCard user={user} setUser={setUser} />
          <SecurityLog />
          <DangerZone user={user} onDeleted={() => { setUser(null); navigate('/', { replace: true }); }} />
        </div>

        <section className="min-w-0" aria-labelledby="projects-title">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 id="projects-title" className="l-display text-[32px] leading-tight">Τα projects μου</h1>
              <p className="mt-1 text-[14px] text-mist">
                {projects.owned.length} δικά σου · {projects.shared.length} κοινοποιημένα σε εσένα
                {projects.stats ? ` · ${projects.stats.collaborators} συνεργάτες` : ''}
              </p>
            </div>
            <div role="tablist" aria-label="Projects" className="inline-flex rounded-full bg-glass-wash p-1 text-[13px] font-medium shadow-[var(--shadow-hairline)]">
              {[['owned', 'Δικά μου'], ['shared', 'Κοινά']].map(([key, label]) => (
                <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)}
                  className={`h-8 rounded-full px-4 transition-colors ${tab === key ? 'bg-[rgb(186_214_247/0.14)] text-white' : 'text-mist hover:text-white'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6" role="tabpanel">
            {projectsLoading ? (
              <div className="flex items-center justify-center gap-2 py-16 text-[14px] text-fog">
                <Loader2 size={16} className="animate-spin" /> Φόρτωση...
              </div>
            ) : list.length === 0 ? (
              <div className="rounded-[16px] py-16 text-center shadow-[inset_0_0_0_1px_rgb(186_215_247/0.12)] [border:1px_dashed_rgb(186_215_247/0.16)]">
                <FolderOpen size={28} className="mx-auto text-fog" aria-hidden="true" />
                <p className="mt-3 text-[14px] text-mist">
                  {tab === 'owned' ? 'Δεν έχεις δημιουργήσει ακόμα project.' : 'Κανείς δεν έχει κοινοποιήσει project σε εσένα.'}
                </p>
                {tab === 'owned' && <Link to="/app" className="l-btn l-btn-primary mt-5">Δημιούργησε το πρώτο σου project</Link>}
              </div>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {list.map((p) => (
                  <li key={p.public_id || p.name}>
                    <button type="button" onClick={() => openProject(p.name)} className="l-card l-lift w-full p-5 text-left">
                      <div className="flex items-start justify-between gap-3">
                        <p className="truncate font-semibold text-ice">{p.name}</p>
                        <div className="flex shrink-0 gap-1.5">
                          {tab === 'shared' && <span className="l-badge">{ROLE_LABEL[p.role] || p.role}</span>}
                          {p.members_count > 1 && <span className="l-badge"><Users size={11} aria-hidden="true" /> {p.members_count}</span>}
                        </div>
                      </div>
                      <p className="mt-2 text-[12.5px] text-fog">
                        {tab === 'shared' && p.owner_name ? `Από ${p.owner_name} · ` : ''}
                        Τελευταία αλλαγή {formatDate(p.updated_at || p.created_at)}
                        {p.updated_by?.display_name && p.updated_by.id !== user?.id ? ` από ${p.updated_by.display_name}` : ''}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

// --- Έλεγχος δύο βημάτων ---
function TwoFactorCard({ user, setUser }) {
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
      autoComplete="one-time-code" className="l-input" required aria-label="Κωδικός δύο βημάτων" maxLength={11} />
  );

  return (
    <Card title="Έλεγχος δύο βημάτων" icon={ShieldCheck}>
      {codes ? (
        <div className="mt-4 space-y-4 animate-rise">
          <p className="l-alert l-alert-info">Αποθήκευσε αυτούς τους κωδικούς κάπου ασφαλές. Αν χάσεις το κινητό ή την πρόσβαση στο email σου, θα μπεις μόνο με αυτούς. <strong>Δεν θα τους ξαναδείς.</strong></p>
          <ul className="grid grid-cols-2 gap-2 rounded-[10px] bg-input-fill p-4 font-mono text-[14px] text-ice shadow-[var(--shadow-hairline)]">
            {codes.map((c) => <li key={c}>{c}</li>)}
          </ul>
          <div className="flex gap-2">
            <button type="button" onClick={copyCodes} className="l-btn l-btn-ghost l-btn-sm flex-1"><Copy size={14} /> Αντιγραφή</button>
            <button type="button" onClick={downloadCodes} className="l-btn l-btn-ghost l-btn-sm flex-1"><Download size={14} /> Λήψη .txt</button>
          </div>
          <button type="button" onClick={() => setCodes(null)} className="l-btn l-btn-primary w-full">Τους αποθήκευσα</button>
        </div>
      ) : status === null ? (
        <Loader2 size={16} className="mt-4 animate-spin text-fog" />
      ) : status.enabled ? (
        <div className="mt-3 space-y-4">
          <p className="flex items-center gap-2 text-[14px] text-[#7fdcc9]">
            <ShieldCheck size={15} aria-hidden="true" /> Ενεργός ({emailMethod ? 'κωδικός στο email' : 'εφαρμογή authenticator'}) · {status.backup_codes_left} εφεδρικοί
          </p>
          {!manage ? (
            <div className="flex flex-col gap-2">
              <button type="button" onClick={() => setManage('regenerate')} className="l-btn l-btn-ghost l-btn-sm">Νέοι εφεδρικοί κωδικοί</button>
              <button type="button" onClick={() => setManage('disable')} className="l-btn l-btn-sm text-fog hover:text-[#ffb8a3]">Απενεργοποίηση</button>
            </div>
          ) : (
            <form onSubmit={submitManage} className="space-y-3 animate-rise">
              {manage === 'disable' && hasPassword && (
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Ο κωδικός του λογαριασμού" autoComplete="current-password" className="l-input" required aria-label="Ο κωδικός του λογαριασμού" />
              )}
              {codeInput}
              {emailMethod && <button type="button" onClick={sendManageCode} disabled={busy} className="text-[13px] text-mist hover:text-white">Αποστολή κωδικού στο email</button>}
              <div className="flex gap-2">
                <button type="button" onClick={reset} className="l-btn l-btn-outline l-btn-sm flex-1">Άκυρο</button>
                <button type="submit" disabled={busy} className={`l-btn l-btn-sm flex-1 ${manage === 'disable' ? 'l-btn-danger' : 'l-btn-primary'}`}>
                  {busy && <Loader2 size={14} className="animate-spin" />} {manage === 'disable' ? 'Απενεργοποίηση' : 'Δημιουργία'}
                </button>
              </div>
            </form>
          )}
        </div>
      ) : !mode ? (
        <div className="mt-3 space-y-4">
          <p className="text-[13.5px] leading-relaxed text-fog">Ακόμα κι αν κάποιος μάθει τον κωδικό σου, δεν θα μπορεί να μπει χωρίς τον δεύτερο κωδικό.</p>
          <button type="button" onClick={() => setMode('choose')} className="l-btn l-btn-primary w-full">Ενεργοποίηση</button>
        </div>
      ) : mode === 'choose' ? (
        <div className="mt-4 space-y-2 animate-rise">
          <button type="button" onClick={() => setMode('totp')} className="l-card l-lift w-full p-4 text-left">
            <p className="font-medium text-ice">Εφαρμογή authenticator <span className="l-badge ml-1">Προτείνεται</span></p>
            <p className="mt-1 text-[13px] text-fog">Google / Microsoft Authenticator, Authy, 1Password. Η πιο ασφαλής επιλογή.</p>
          </button>
          <button type="button" onClick={() => setMode('email')} disabled={!status.email_available || !user?.email_verified} className="l-card l-lift w-full p-4 text-left disabled:opacity-50">
            <p className="font-medium text-ice">Κωδικός στο email</p>
            <p className="mt-1 text-[13px] text-fog">{user?.email_verified ? 'Σε κάθε σύνδεση στέλνουμε κωδικό 6 ψηφίων στο email σου.' : 'Επιβεβαίωσε πρώτα το email σου.'}</p>
          </button>
          <button type="button" onClick={reset} className="l-btn l-btn-sm w-full text-fog hover:text-white">Άκυρο</button>
        </div>
      ) : !setup ? (
        <form onSubmit={start} className="mt-4 space-y-3 animate-rise">
          <p className="text-[13.5px] text-mist">{hasPassword ? 'Για ασφάλεια, γράψε τον κωδικό του λογαριασμού σου.' : 'Επιβεβαίωσε ότι είσαι εσύ (σύνδεση με Google τα τελευταία 10 λεπτά).'}</p>
          {hasPassword && (
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Κωδικός λογαριασμού" autoComplete="current-password" className="l-input" required autoFocus aria-label="Κωδικός λογαριασμού" />
          )}
          <div className="flex gap-2">
            <button type="button" onClick={reset} className="l-btn l-btn-outline flex-1">Άκυρο</button>
            <button type="submit" disabled={busy} className="l-btn l-btn-primary flex-1">{busy && <Loader2 size={15} className="animate-spin" />} Συνέχεια</button>
          </div>
        </form>
      ) : (
        <form onSubmit={enable} className="mt-4 space-y-4 animate-rise">
          {mode === 'totp' ? (
            <>
              <ol className="space-y-2 text-[13.5px] text-mist [&>li]:ml-4 [&>li]:list-decimal">
                <li>Άνοιξε μια εφαρμογή authenticator (Google Authenticator, Microsoft Authenticator, Authy, 1Password…).</li>
                <li>Σκάναρε τον κωδικό QR ή γράψε το κλειδί.</li>
                <li>Γράψε τον 6ψήφιο κωδικό που εμφανίζεται.</li>
              </ol>
              {setup.qr && <img src={setup.qr} alt="Κωδικός QR για την εφαρμογή authenticator" className="mx-auto h-44 w-44 rounded-[12px] bg-white p-2" />}
              <p className="break-all rounded-[8px] bg-input-fill p-2.5 text-center font-mono text-[12.5px] tracking-wider text-frost shadow-[var(--shadow-hairline)]" aria-label="Κλειδί για χειροκίνητη εισαγωγή">{setup.secret.match(/.{1,4}/g).join(' ')}</p>
            </>
          ) : (
            <p className="text-[13.5px] text-mist">Γράψε τον κωδικό που στείλαμε στο {setup.email}.</p>
          )}
          <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} inputMode="numeric" maxLength={6}
            autoComplete="one-time-code" placeholder="000000" className="l-input l-input-code" aria-label="Κωδικός 6 ψηφίων" required />
          <div className="flex gap-2">
            <button type="button" onClick={reset} className="l-btn l-btn-outline flex-1">Άκυρο</button>
            <button type="submit" disabled={busy || code.length !== 6} className="l-btn l-btn-primary flex-1">{busy && <Loader2 size={15} className="animate-spin" />} Ενεργοποίηση</button>
          </div>
        </form>
      )}
    </Card>
  );
}

// --- Επιβεβαίωση email ---
function VerifyEmailBanner({ user }) {
  const [sent, setSent] = useState(false);
  if (!user || user.email_verified) return null;
  const resend = async () => {
    try { await axios.post(`${API_BASE_URL}/api/me/verify-email`); setSent(true); } catch (err) { toast.error(apiErrorMessage(err)); }
  };
  return (
    <div role="status" className="l-alert l-alert-info flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <span>Επιβεβαίωσε το email σου ({user.email}) για να προστατέψεις τον λογαριασμό σου.</span>
      <button type="button" onClick={resend} disabled={sent} className="l-btn l-btn-ghost l-btn-sm shrink-0">{sent ? 'Στάλθηκε' : 'Αποστολή συνδέσμου'}</button>
    </div>
  );
}

// --- Κωδικός και συσκευές ---
function PasswordCard({ user, setUser }) {
  const { passwordMin } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirmNext, setConfirmNext] = useState('');
  const [valid, setValid] = useState(false);
  const [open, setOpen] = useState(false);
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
      setCurrent(''); setNext(''); setConfirmNext(''); setOpen(false);
      toast.success(hasPassword ? 'Ο κωδικός άλλαξε. Οι άλλες συσκευές αποσυνδέθηκαν.' : 'Ο κωδικός ορίστηκε. Μπορείς πλέον να μπαίνεις και από το πρόγραμμα των Windows.');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Αποτυχία αλλαγής κωδικού'));
    } finally { setBusy(false); }
  };

  const logoutEverywhere = async () => {
    if (!window.confirm('Να αποσυνδεθούν όλες οι άλλες συσκευές (browsers και πρόγραμμα Windows);')) return;
    try {
      await axios.post(`${API_BASE_URL}/api/me/logout-all`);
      toast.success('Αποσυνδέθηκαν όλες οι άλλες συσκευές');
    } catch (err) { toast.error(apiErrorMessage(err, 'Αποτυχία')); }
  };

  return (
    <Card title={hasPassword ? 'Κωδικός' : 'Ορισμός κωδικού'} icon={KeyRound}>
      {!hasPassword && <p className="mt-2 text-[13px] text-fog">Μπαίνεις με Google. Όρισε κωδικό για να συνδέεσαι και με email ή από το πρόγραμμα των Windows.</p>}
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className="l-btn l-btn-ghost mt-4 w-full">{hasPassword ? 'Αλλαγή κωδικού' : 'Ορισμός κωδικού'}</button>
      ) : (
        <form onSubmit={changePassword} className="mt-4 space-y-3 animate-rise">
          {hasPassword && (
            <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="Τρέχων κωδικός" aria-label="Τρέχων κωδικός" autoComplete="current-password" className="l-input" required />
          )}
          <input type="password" value={next} onChange={(e) => setNext(e.target.value)} placeholder="Νέος κωδικός" aria-label="Νέος κωδικός" autoComplete="new-password" className="l-input" required maxLength={128} aria-describedby="new-pw-strength" />
          <PasswordStrength id="new-pw-strength" password={next} email={user?.email} name={user?.display_name} min={passwordMin} onValidity={setValid} />
          <input type="password" value={confirmNext} onChange={(e) => setConfirmNext(e.target.value)} placeholder="Επιβεβαίωση νέου κωδικού" aria-label="Επιβεβαίωση νέου κωδικού" autoComplete="new-password" className="l-input" required maxLength={128} />
          <div className="flex gap-2">
            <button type="button" onClick={() => setOpen(false)} className="l-btn l-btn-outline flex-1">Άκυρο</button>
            <button type="submit" disabled={busy} className="l-btn l-btn-primary flex-1">{busy && <Loader2 size={15} className="animate-spin" />} Αποθήκευση</button>
          </div>
        </form>
      )}
      <button type="button" onClick={logoutEverywhere} className="l-btn l-btn-sm mt-3 w-full text-mist hover:bg-glass-wash hover:text-white">
        <MonitorSmartphone size={15} aria-hidden="true" /> Αποσύνδεση από όλες τις άλλες συσκευές
      </button>
    </Card>
  );
}

// --- Πρόσφατη δραστηριότητα ασφαλείας ---
function SecurityLog() {
  const [events, setEvents] = useState(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open || events) return;
    axios.get(`${API_BASE_URL}/api/me/security-events`).then(({ data }) => setEvents(data.events || [])).catch(() => setEvents([]));
  }, [open, events]);
  const bad = (e) => /failed|blocked/.test(e.event);
  return (
    <Card>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}
        className="flex w-full items-center justify-between text-[15px] font-semibold text-ice">
        <span className="flex items-center gap-2"><MonitorSmartphone size={17} aria-hidden="true" /> Πρόσφατες συνδέσεις</span>
        <span className="text-[13px] font-normal text-fog">{open ? 'Απόκρυψη' : 'Εμφάνιση'}</span>
      </button>
      {open && (
        events === null ? <Loader2 size={16} className="mt-4 animate-spin text-fog" /> : (
          <ul className="mt-4 space-y-3 animate-rise">
            {events.length === 0 && <li className="text-[13px] text-fog">Δεν υπάρχει δραστηριότητα.</li>}
            {events.map((e, i) => (
              <li key={i} className="flex items-start justify-between gap-3 text-[13px]">
                <div className="min-w-0">
                  <p className={bad(e) ? 'text-[#ffb8a3]' : 'text-frost'}>{e.label}</p>
                  <p className="truncate text-fog">{[e.client, e.ip].filter(Boolean).join(' · ')}</p>
                </div>
                <time className="shrink-0 text-fog" dateTime={e.at}>{formatDate(e.at, true)}</time>
              </li>
            ))}
          </ul>
        )
      )}
    </Card>
  );
}

// --- Διαγραφή λογαριασμού ---
function DangerZone({ user, onDeleted }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [busy, setBusy] = useState(false);
  const hasPassword = user?.has_password !== false;

  const remove = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await axios.delete(`${API_BASE_URL}/api/me`, { data: { password, confirm: confirmText } });
      const moved = data.transferred?.length ? ` Τα κοινά projects (${data.transferred.join(', ')}) πέρασαν στους συνεργάτες σου.` : '';
      toast.success(`Ο λογαριασμός διαγράφηκε.${moved}`, { duration: 7000 });
      onDeleted();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Αποτυχία διαγραφής'));
    } finally { setBusy(false); }
  };

  return (
    <Card title="Διαγραφή λογαριασμού" icon={ShieldAlert} tone="danger">
      <p className="mt-2 text-[13px] leading-relaxed text-fog">
        Σβήνονται ο λογαριασμός, η εικόνα σου, το ιστορικό ασφαλείας και τα projects που έχεις μόνο εσύ. Όσα projects έχουν
        κι άλλα μέλη δεν χάνονται: περνάνε στον πρώτο συνεργάτη.
      </p>
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className="l-btn l-btn-danger mt-4 w-full">
          <Trash2 size={15} aria-hidden="true" /> Διαγραφή λογαριασμού
        </button>
      ) : (
        <form onSubmit={remove} className="mt-4 space-y-3 animate-rise">
          {hasPassword && (
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Ο κωδικός σου" aria-label="Ο κωδικός σου" className="l-input" required />
          )}
          <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="Γράψε ΔΙΑΓΡΑΦΗ" aria-label="Γράψε ΔΙΑΓΡΑΦΗ για επιβεβαίωση" className="l-input" required />
          <div className="flex gap-2">
            <button type="button" onClick={() => setOpen(false)} className="l-btn l-btn-outline flex-1">Άκυρο</button>
            <button type="submit" disabled={busy || confirmText.trim().toUpperCase() !== 'ΔΙΑΓΡΑΦΗ'}
              className="l-btn flex-1 bg-[#c2452a] text-white hover:bg-[#d4502f]">
              {busy && <Loader2 size={15} className="animate-spin" />} Οριστική διαγραφή
            </button>
          </div>
        </form>
      )}
    </Card>
  );
}
