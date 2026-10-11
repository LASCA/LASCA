import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  ArrowLeft, ArrowUpRight, Camera, Check, Copy, Download, FolderOpen, KeyRound, Loader2, LockKeyhole, LogOut, Mail, MonitorSmartphone, Pencil,
  ShieldCheck, Trash2, Users, X,
} from 'lucide-react';
import { API_BASE_URL } from '../config';
import { apiErrorMessage, useAuth } from '../auth/AuthContext';
import LascaLogo from '../components/brand/LascaLogo';
import PasswordStrength from '../components/ui/PasswordStrength';
import usePageMeta from '../hooks/usePageMeta';
import './Profile.css';

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
  const [isEditing, setIsEditing] = useState(false);

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
      setIsEditing(false);
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

  const cancelEdit = () => {
    setDisplayName(user?.display_name || '');
    setAvatarFile(null);
    setAvatarPreview(null);
    setIsEditing(false);
  };

  const list = tab === 'owned' ? projects.owned : projects.shared;

  return (
    <div className="profile-page relative h-full overflow-y-auto bg-canvas text-frost">
      <div aria-hidden="true" className="l-grid-bg profile-grid pointer-events-none absolute inset-x-0 top-0 h-[520px]" />
      <header className="sticky top-0 z-20 bg-canvas/80 backdrop-blur-xl shadow-[inset_0_-1px_0_rgb(186_215_247/0.1)]">
        <div className="profile-nav mx-auto flex h-[72px] max-w-[1440px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-10">
          <div className="flex min-w-0 items-center gap-3 sm:gap-5">
            <Link to="/app" className="profile-back-link profile-icon-tooltip" aria-label="Πίσω στην εφαρμογή"
              data-tooltip="Πίσω στην εφαρμογή">
              <ArrowLeft size={17} aria-hidden="true" />
            </Link>
            <span className="profile-nav-divider hidden h-7 w-px sm:block" aria-hidden="true" />
            <span className="inline-flex"><LascaLogo height={27} textClass="text-lg" /></span>
          </div>
          <button onClick={handleLogout} className="l-btn l-btn-sm profile-logout">
            <LogOut size={15} aria-hidden="true" /> Αποσύνδεση
          </button>
        </div>
      </header>

      <main id="main" className="profile-layout relative mx-auto grid max-w-[1440px] gap-8 px-4 py-8 sm:px-6 lg:gap-10 lg:px-10 lg:py-10">
        <aside className="profile-settings profile-id-card h-fit" aria-labelledby="settings-title">
          <div className="profile-id-form">
            <div className="profile-id-topbar">
              <div className="profile-id-title">
                <span className="profile-id-indicator" aria-hidden="true" />
                <h2 id="settings-title">ΤΑΥΤΟΤΗΤΑ ΧΡΗΣΤΗ</h2>
              </div>
              <div className="profile-id-header-actions">
                <button type="button" onClick={() => setIsEditing(true)} disabled={isEditing}
                  className="profile-edit-toggle profile-icon-tooltip" aria-label="Επεξεργασία προφίλ"
                  data-tooltip="Επεξεργασία προφίλ">
                  <Pencil size={15} aria-hidden="true" />
                </button>
                <DangerZone user={user} onDeleted={() => { setUser(null); navigate('/', { replace: true }); }} />
                {isEditing && (
                  <button type="button" onClick={cancelEdit}
                    className="profile-edit-toggle profile-icon-tooltip" aria-label="Κλείσιμο επεξεργασίας"
                    data-tooltip="Κλείσιμο επεξεργασίας">
                    <X size={16} aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>

            <div className="profile-id-content">
              <div className="profile-id-avatar-column">
                <button type="button" onClick={() => fileInput.current?.click()}
                  className="profile-avatar-button profile-id-avatar group relative rounded-full"
                  aria-label="Αλλαγή εικόνας προφίλ">
                  <Avatar url={avatarPreview || user?.avatar_url} name={displayName || user?.display_name} size={86} />
                  <span className="profile-avatar-overlay absolute inset-0 flex items-center justify-center rounded-full opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                    <Camera size={19} aria-hidden="true" />
                  </span>
                </button>
                <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                  onChange={(e) => { pickAvatar(e.target.files?.[0]); e.target.value = ''; }} aria-label="Επιλογή εικόνας προφίλ" />
                <span className="profile-id-avatar-hint">LASCA ID</span>
                {user?.avatar_url && !avatarPreview && (
                  <button type="button" onClick={removeAvatar} className="profile-remove-avatar">Αφαίρεση εικόνας</button>
                )}
              </div>

              <div className="profile-id-fields">
                <form onSubmit={save} className="profile-id-edit-form">
                  <div className="profile-id-field">
                    <span className="profile-id-label">Όνομα χρήστη</span>
                    {isEditing ? (
                      <input id="display_name" value={displayName} maxLength={60} onChange={(e) => setDisplayName(e.target.value)}
                        className="l-input profile-id-input" autoFocus />
                    ) : (
                      <p className="profile-id-value">{user?.display_name || '—'}</p>
                    )}
                  </div>
                  <div className="profile-id-field">
                    <span className="profile-id-label">Email</span>
                    <div className="profile-id-email-row">
                      <p className="profile-id-value profile-id-email">
                        <LockKeyhole size={13} aria-hidden="true" /><span className="profile-id-email-text">{user?.email || '—'}</span>
                      </p>
                      <EmailVerificationStatus user={user} />
                    </div>
                  </div>
                  {isEditing && (
                    <div className="profile-id-actions">
                      <button type="submit" disabled={!dirty || saving} className="l-btn l-btn-primary l-btn-sm">
                        {saving && <Loader2 size={15} className="animate-spin" />} Αποθήκευση αλλαγών
                      </button>
                    </div>
                  )}
                </form>
                <div className="profile-id-field profile-id-password">
                  <span className="profile-id-label">Κωδικός</span>
                  <p className="profile-id-value profile-password-mask" aria-label="Ο κωδικός είναι κρυμμένος">••••••••</p>
                  <div className="profile-password-action" hidden={!isEditing}>
                    <PasswordCard user={user} setUser={setUser} />
                  </div>
                </div>
              </div>
            </div>

            <div className="profile-id-security">
              <TwoFactorCard user={user} setUser={setUser} />
              <SecurityLog />
            </div>
          </div>
        </aside>

        <section className="min-w-0" aria-labelledby="projects-title">
          <div className="profile-projects-heading flex flex-col justify-between gap-4 pb-6 sm:flex-row sm:items-center">
            <div>
              <p className="profile-workspace-label mb-2"><span aria-hidden="true">•</span> ΧΩΡΟΣ ΕΡΓΑΣΙΑΣ</p>
              <h1 id="projects-title" className="l-display text-2xl font-bold leading-tight tracking-tight text-white">Τα projects μου</h1>
            </div>
            <div role="tablist" aria-label="Projects" className="profile-project-tabs inline-flex p-1 text-[13px] font-medium">
              {[
                ['owned', 'Δικά μου', projects.owned.length],
                ['shared', 'Κοινά', projects.shared.length],
              ].map(([key, label, count]) => (
                <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)}
                  className={`profile-project-tab h-9 rounded-xl px-5 transition-colors ${tab === key ? 'profile-tab-active text-white' : 'text-mist hover:text-white'}`}>
                  <span>{label}</span>
                  <span className={`profile-project-tab-count ${tab === key ? 'is-active' : ''}`}>{count}</span>
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
              <div className="profile-empty rounded-[16px] py-16 text-center">
                <FolderOpen size={27} strokeWidth={1.5} className="profile-empty-icon mx-auto" aria-hidden="true" />
                <p className="profile-empty-label mt-3">
                  {tab === 'owned' ? 'Δεν έχεις δημιουργήσει ακόμα project.' : 'Κανείς δεν έχει κοινοποιήσει project σε εσένα.'}
                </p>
              </div>
            ) : (
              <ul className="profile-project-grid grid grid-cols-1 gap-4 md:grid-cols-2">
                {list.map((p) => (
                  <li key={p.public_id || p.name} className="profile-project-item">
                    <button type="button" onClick={() => openProject(p.name)} className="profile-project-card l-card l-lift w-full p-5 text-left">
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="profile-project-icon" aria-hidden="true"><FolderOpen size={18} /></span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-ice">{p.name}</p>
                          <p className="mt-2 text-[12.5px] text-fog">
                            {tab === 'shared' && p.owner_name ? `Από ${p.owner_name} · ` : ''}
                            Τελευταία αλλαγή {formatDate(p.updated_at || p.created_at)}
                            {p.updated_by?.display_name && p.updated_by.id !== user?.id ? ` από ${p.updated_by.display_name}` : ''}
                          </p>
                        </div>
                        <span className="profile-project-open" aria-hidden="true"><ArrowUpRight size={14} /></span>
                      </div>
                      <div className="profile-project-meta flex shrink-0 gap-1.5">
                        <span className={`profile-project-status ${tab === 'shared' ? 'is-shared' : ''}`} aria-label={tab === 'shared' ? 'Κοινό project' : 'Δικό σου project'} />
                        <div className="flex shrink-0 gap-1.5">
                          {tab === 'shared' && <span className="l-badge">{ROLE_LABEL[p.role] || p.role}</span>}
                          {p.members_count > 1 && <span className="l-badge"><Users size={11} aria-hidden="true" /> {p.members_count}</span>}
                        </div>
                      </div>
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
    <details className="profile-2fa-details">
      <summary className="profile-2fa-summary">
        <span><ShieldCheck size={15} aria-hidden="true" /> Έλεγχος δύο βημάτων</span>
        <span className={`profile-2fa-status ${status?.enabled ? 'is-enabled' : ''}`}>
          {status === null ? '...' : status.enabled ? 'Ενεργός' : 'Ανενεργό'}
        </span>
      </summary>
      <div className="profile-2fa-content">
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
      </div>
    </details>
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
      <span className="profile-email-verified" role="status">
        <Check size={12} aria-hidden="true" /> Επιβεβαιωμένο
      </span>
    );
  }
  return (
    <button type="button" onClick={resend} disabled={sent}
      className={`profile-email-resend profile-icon-tooltip ${sent ? 'is-sent' : ''}`}
      aria-label={sent ? 'Στάλθηκε!' : 'Αποστολή συνδέσμου επιβεβαίωσης email'}
      data-tooltip={sent ? 'Στάλθηκε!' : 'Αποστολή συνδέσμου επιβεβαίωσης email'}>
      {sent ? <Check size={14} aria-hidden="true" /> : <Mail size={14} aria-hidden="true" />}
    </button>
  );
}

// --- Κωδικός και συσκευές ---
function PasswordCard({ user, setUser }) {
  const { passwordMin, passwordRecommended } = useAuth();
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
          <PasswordStrength id="new-pw-strength" password={next} email={user?.email} name={user?.display_name} min={passwordMin} recommended={passwordRecommended} onValidity={setValid} />
          <input type="password" value={confirmNext} onChange={(e) => setConfirmNext(e.target.value)} placeholder="Επιβεβαίωση νέου κωδικού" aria-label="Επιβεβαίωση νέου κωδικού" autoComplete="new-password" className="l-input" required maxLength={128} />
          <div className="flex gap-2">
            <button type="button" onClick={() => setOpen(false)} className="l-btn l-btn-outline flex-1">Άκυρο</button>
            <button type="submit" disabled={busy} className="l-btn l-btn-primary flex-1">{busy && <Loader2 size={15} className="animate-spin" />} Αποθήκευση</button>
          </div>
        </form>
      )}
      <button type="button" onClick={logoutEverywhere} className="l-btn l-btn-sm profile-logout-everywhere mt-3 w-full text-mist hover:bg-glass-wash hover:text-white">
        <MonitorSmartphone size={15} aria-hidden="true" /><span>Αποσύνδεση από όλες τις άλλες συσκευές</span>
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
  const [busy, setBusy] = useState(false);
  const hasPassword = user?.has_password !== false;

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

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="profile-delete-trigger profile-icon-tooltip"
        aria-label="Διαγραφή λογαριασμού" data-tooltip="Διαγραφή λογαριασμού">
        <Trash2 size={16} aria-hidden="true" />
      </button>
      {open && createPortal(
        <div className="profile-delete-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setOpen(false);
        }}>
          <section className="profile-delete-modal" role="dialog" aria-modal="true" aria-labelledby="delete-account-title">
            <div className="profile-delete-modal-icon"><Trash2 size={19} aria-hidden="true" /></div>
            <h2 id="delete-account-title">Διαγραφή λογαριασμού</h2>
            <p className="profile-delete-prompt">Είστε σίγουροι ότι θέλετε να διαγράψετε οριστικά τον λογαριασμό σας;</p>
            <p className="profile-delete-description">
              Σβήνονται ο λογαριασμός, η εικόνα σου, το ιστορικό ασφαλείας και τα projects που έχεις μόνο εσύ. Όσα projects έχουν
              κι άλλα μέλη δεν χάνονται: περνάνε στον πρώτο συνεργάτη.
            </p>
            <form onSubmit={remove} className="profile-delete-form">
              {hasPassword && (
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Ο κωδικός σου" aria-label="Ο κωδικός σου" className="l-input" required />
              )}
              <div className="profile-delete-actions">
                <button type="button" onClick={() => setOpen(false)} className="l-btn l-btn-outline flex-1">Ακύρωση</button>
                <button type="submit" disabled={busy || (hasPassword && !password)}
                  className="l-btn profile-delete-submit flex-1">
                  {busy && <Loader2 size={15} className="animate-spin" />} Οριστική Διαγραφή
                </button>
              </div>
            </form>
          </section>
        </div>,
        document.body
      )}
    </>
  );
}
