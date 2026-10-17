import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { useClerk, useUser } from '@clerk/react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  ArrowLeft, ArrowUpRight, ChevronDown, Copy, Download, FolderOpen, KeyRound, Loader2, LockKeyhole,
  LogOut, MonitorSmartphone, Pencil, ShieldCheck, Trash2, Users, X,
} from 'lucide-react';
import { API_BASE_URL } from '../config';
import { apiErrorMessage, useAuth } from '../auth/AuthContext';
import LascaLogo from '../components/brand/LascaLogo';
import usePageMeta from '../hooks/usePageMeta';
import './Profile.css';

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

function Avatar({ url, name, size = 64 }) {
  const [failedUrl, setFailedUrl] = useState(null);
  const initials = (name || 'U').trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
  if (!url || failedUrl === url) {
    return (
      <div style={{ width: size, height: size }}
        className="flex items-center justify-center rounded-full bg-slate-800 border border-slate-700 text-lg font-bold text-slate-100">
        {initials}
      </div>
    );
  }
  return <img src={url} alt="" style={{ width: size, height: size }} onError={() => setFailedUrl(url)} className="rounded-full object-cover" />;
}

/** Γραμμή ρυθμίσεων με εικονίδιο, τίτλο και υπότιτλο. */
function Row({ icon: Icon, title, subtitle, onClick, tone, right, open, children }) {
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
  const { openUserProfile } = useClerk();
  const { user: clerkUser } = useUser();
  const navigate = useNavigate();

  const [school, setSchool] = useState(user?.school || '');
  const [company, setCompany] = useState(user?.company || '');
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [openRow, setOpenRow] = useState(null);

  const [projects, setProjects] = useState({ owned: [], shared: [] });
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [tab, setTab] = useState('owned');

  useEffect(() => {
    axios.get(`${API_BASE_URL}/api/me/projects`)
      .then(({ data }) => setProjects({ owned: data.owned || [], shared: data.shared || [] }))
      .catch((err) => toast.error(apiErrorMessage(err, 'Αποτυχία φόρτωσης projects')))
      .finally(() => setProjectsLoading(false));
  }, []);

  const dirty = useMemo(
    () => school.trim() !== (user?.school || '') || company.trim() !== (user?.company || ''),
    [school, company, user]
  );

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = new FormData();
      payload.append('school', school.trim());
      payload.append('company', company.trim());
      const { data } = await axios.put(`${API_BASE_URL}/api/me`, payload);
      setUser(data);
      setSchool(data.school || '');
      setCompany(data.company || '');
      setIsEditing(false);
      toast.success('Το προφίλ αποθηκεύτηκε');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Αποτυχία αποθήκευσης'));
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    setSchool(user?.school || '');
    setCompany(user?.company || '');
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
    if (!window.confirm('Να αποσυνδεθούν όλες οι άλλες συσκευές;')) return;
    try {
      await axios.post(`${API_BASE_URL}/api/me/logout-all`);
      toast.success('Αποσυνδέθηκαν όλες οι άλλες συσκευές');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Αποτυχία αποσύνδεσης συσκευών'));
    }
  };

  const toggleRow = (key) => setOpenRow((current) => (current === key ? null : key));

  const list = tab === 'owned' ? projects.owned : projects.shared;

  return (
    <div className="profile-page relative h-full overflow-y-auto bg-slate-950 text-slate-200 font-sans">
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
          <button type="button" onClick={handleLogout} className="l-btn l-btn-sm profile-logout">
            <LogOut size={15} aria-hidden="true" /> Αποσύνδεση
          </button>
        </div>
      </header>

      <main id="main" className="profile-layout relative mx-auto grid max-w-[1440px] gap-8 px-4 py-8 sm:px-6 lg:gap-10 lg:px-10 lg:py-10">
        <aside className="profile-settings-stack flex min-w-0 flex-col gap-6" aria-label="Ρυθμίσεις προφίλ">
          <section className="profile-id-card h-fit" aria-labelledby="settings-title">
            <div className="profile-id-topbar">
              <div className="profile-id-title">
                <span className="profile-id-indicator" aria-hidden="true" />
                <h2 id="settings-title">ΤΑΥΤΟΤΗΤΑ ΧΡΗΣΤΗ</h2>
              </div>
              <div className="profile-id-header-actions">
                {!isEditing ? (
                  <button type="button" onClick={() => setIsEditing(true)}
                    className="profile-edit-toggle profile-icon-tooltip" aria-label="Επεξεργασία προφίλ"
                    data-tooltip="Επεξεργασία προφίλ">
                    <Pencil size={15} aria-hidden="true" />
                  </button>
                ) : (
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
                <div className="profile-id-avatar rounded-full">
                  <Avatar url={clerkUser?.imageUrl} name={clerkUser?.fullName || clerkUser?.firstName || user?.display_name} size={86} />
                </div>
              </div>

              <div className="profile-id-fields">
                <form onSubmit={save} className="profile-id-edit-form">
                  <div className="profile-id-field">
                    <span className="profile-id-label">Email</span>
                    <p className="profile-id-value profile-id-email">
                      <LockKeyhole size={13} aria-hidden="true" />
                      <span className="profile-id-email-text">{user?.email || '—'}</span>
                    </p>
                  </div>
                  {(isEditing || user?.school || user?.company) && (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="profile-id-field">
                        <label className="profile-id-label" htmlFor="profile-school">Σχολή</label>
                        {isEditing ? (
                          <input id="profile-school" value={school} maxLength={120} onChange={(e) => setSchool(e.target.value)}
                            className="l-input profile-id-input" placeholder="π.χ. ΑΤΜ ΑΠΘ" />
                        ) : (
                          <p className="profile-id-value">{user?.school || '—'}</p>
                        )}
                      </div>
                      <div className="profile-id-field">
                        <label className="profile-id-label" htmlFor="profile-company">Εταιρεία</label>
                        {isEditing ? (
                          <input id="profile-company" value={company} maxLength={120} onChange={(e) => setCompany(e.target.value)}
                            className="l-input profile-id-input" />
                        ) : (
                          <p className="profile-id-value">{user?.company || '—'}</p>
                        )}
                      </div>
                    </div>
                  )}
                  {isEditing && (
                    <div className="profile-id-actions">
                      <button type="submit" disabled={!dirty || saving} className="l-btn l-btn-primary l-btn-sm">
                        {saving && <Loader2 size={15} className="animate-spin" />} Αποθήκευση αλλαγών
                      </button>
                      <button type="button" onClick={cancelEdit} className="l-btn l-btn-outline l-btn-sm">Άκυρο</button>
                    </div>
                  )}
                </form>
              </div>
            </div>

          </section>

          <section className="profile-id-card h-fit" aria-labelledby="security-title">
            <div className="profile-id-topbar">
              <div className="profile-id-title">
                <span className="profile-id-indicator" aria-hidden="true" />
                <h2 id="security-title">ΑΣΦΑΛΕΙΑ &amp; ΔΙΑΧΕΙΡΙΣΗ</h2>
              </div>
            </div>
            <div className="profile-id-security">
              <div className={`${CARD} l-card overflow-hidden`}>
                <Row icon={KeyRound} title="Διαχείριση Λογαριασμού & Ασφάλειας"
                  subtitle="Αλλαγή κωδικού, φωτογραφίας & ασφάλεια μέσω Clerk"
                  onClick={() => openUserProfile()} />
                <Row icon={Trash2} tone="danger" title="Διαγραφή λογαριασμού"
                  subtitle="Οριστική διαγραφή του λογαριασμού σου" onClick={() => setDeleteOpen(true)} />
              </div>
            </div>
          </section>

          <section className="profile-id-card h-fit" aria-labelledby="devices-security-title">
            <div className="profile-id-topbar">
              <div className="profile-id-title">
                <span className="profile-id-indicator" aria-hidden="true" />
                <h2 id="devices-security-title">ΣΥΣΚΕΥΕΣ &amp; ΕΠΙΠΛΕΟΝ ΑΣΦΑΛΕΙΑ</h2>
              </div>
            </div>
            <div className="profile-id-security">
              <div className={`${CARD} l-card overflow-hidden`}>
                <TwoFactorRow user={user} setUser={setUser}
                  open={openRow === '2fa'} onToggle={() => toggleRow('2fa')} />
                <Row icon={MonitorSmartphone} title="Πρόσφατες συνδέσεις"
                  subtitle="Συνδέσεις και αλλαγές ασφαλείας" open={openRow === 'log'}
                  onClick={() => toggleRow('log')}>
                  <SecurityLog />
                </Row>
                <Row icon={LogOut} title="Αποσύνδεση από όλες τις συσκευές"
                  subtitle="Απενεργοποιεί όλες τις άλλες συνδέσεις" onClick={logoutEverywhere} />
              </div>
            </div>
          </section>
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
                        <span className="profile-project-icon" aria-hidden="true">
                          {tab === 'shared' ? <Users size={18} /> : <FolderOpen size={18} />}
                        </span>
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
                        <span className={`profile-project-status ${tab === 'shared' ? 'is-shared' : ''}`}
                          aria-label={tab === 'shared' ? 'Κοινό project' : 'Δικό σου project'} />
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

      <DeleteAccountDialog open={deleteOpen} onClose={() => setDeleteOpen(false)} user={user}
        onDeleted={() => { setUser(null); navigate('/', { replace: true }); }} />
    </div>
  );
}

function TwoFactorRow({ user, setUser, open, onToggle }) {
  const [status, setStatus] = useState(null);
  const [mode, setMode] = useState(null);
  const [setup, setSetup] = useState(null);
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [backupCodes, setBackupCodes] = useState(null);
  const [manage, setManage] = useState(null);
  const [busy, setBusy] = useState(false);
  const hasPassword = user?.has_password !== false;

  useEffect(() => {
    axios.get(`${API_BASE_URL}/api/me/2fa`)
      .then(({ data }) => setStatus(data))
      .catch((err) => {
        toast.error(apiErrorMessage(err, 'Αποτυχία φόρτωσης ρυθμίσεων δύο βημάτων'));
        setStatus({ enabled: false });
      });
  }, []);

  const reset = () => {
    setMode(null);
    setSetup(null);
    setPassword('');
    setCode('');
    setManage(null);
  };

  const run = async (operation) => {
    setBusy(true);
    try {
      await operation();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const startSetup = (event) => {
    event.preventDefault();
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

  const enable = (event) => {
    event.preventDefault();
    run(async () => {
      const path = mode === 'totp' ? '/api/me/2fa/enable' : '/api/me/2fa/email/enable';
      const { data } = await axios.post(`${API_BASE_URL}${path}`, { code });
      setBackupCodes(data.backup_codes);
      setStatus(data);
      reset();
      setUser({ ...user, two_factor_enabled: true });
      toast.success('Ο έλεγχος δύο βημάτων ενεργοποιήθηκε.');
    });
  };

  const sendManageCode = () => run(async () => {
    const { data } = await axios.post(`${API_BASE_URL}/api/me/2fa/send-code`);
    toast.success(`Στείλαμε κωδικό στο ${data.email_hint}`);
  });

  const submitManage = (event) => {
    event.preventDefault();
    run(async () => {
      if (manage === 'disable') {
        const { data } = await axios.post(`${API_BASE_URL}/api/me/2fa/disable`, { password, code });
        setStatus(data);
        setUser({ ...user, two_factor_enabled: false });
        toast.success('Ο έλεγχος δύο βημάτων απενεργοποιήθηκε');
      } else {
        const { data } = await axios.post(`${API_BASE_URL}/api/me/2fa/backup-codes`, { code });
        setBackupCodes(data.backup_codes);
        setStatus(data);
      }
      reset();
    });
  };

  const copyCodes = async () => {
    try {
      await navigator.clipboard.writeText(backupCodes.join('\n'));
      toast.success('Αντιγράφηκαν');
    } catch {
      toast.error('Η αντιγραφή απέτυχε');
    }
  };

  const downloadCodes = () => {
    const blob = new Blob([`Εφεδρικοί κωδικοί LASCA (${user.email})\n\n${backupCodes.join('\n')}\n`], {
      type: 'text/plain;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'lasca-backup-codes.txt';
    link.click();
    URL.revokeObjectURL(url);
  };

  const emailMethod = status?.method === 'email';
  const codeInput = (
    <input value={code} onChange={(event) => setCode(event.target.value)}
      placeholder={emailMethod || mode === 'email' ? 'Κωδικός από το email' : 'Κωδικός εφαρμογής'}
      autoComplete="one-time-code" className={INPUT} required aria-label="Κωδικός δύο βημάτων" maxLength={11} />
  );
  const badge = (
    <span className={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-bold ${status?.enabled
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
      : 'border-slate-700 bg-slate-900 text-slate-400'}`}>
      {status === null ? '…' : status.enabled ? 'Ενεργός' : 'Ανενεργός'}
    </span>
  );
  const optionClass = 'w-full rounded-xl border border-slate-800 p-3 text-left transition-colors hover:bg-slate-800 hover:border-slate-700 disabled:opacity-50';

  return (
    <Row icon={ShieldCheck} title="Έλεγχος δύο βημάτων" subtitle="Δεύτερος κωδικός σε κάθε σύνδεση"
      right={badge} open={open || Boolean(backupCodes)} onClick={onToggle}>
      {backupCodes ? (
        <div className="space-y-3">
          <p className="rounded-xl border border-blue-500/25 bg-blue-500/[0.07] px-3 py-2 text-[12px] leading-relaxed text-blue-100">
            Αποθήκευσε αυτούς τους κωδικούς σε ασφαλές σημείο. Δεν θα εμφανιστούν ξανά.
          </p>
          <ul className="grid grid-cols-2 gap-2 rounded-xl border border-slate-800 bg-slate-900/70 p-3 font-mono text-[13px] text-slate-100">
            {backupCodes.map((backupCode) => <li key={backupCode}>{backupCode}</li>)}
          </ul>
          <div className="flex gap-2">
            <button type="button" onClick={copyCodes} className={`${BTN_GHOST} flex-1`}><Copy size={14} /> Αντιγραφή</button>
            <button type="button" onClick={downloadCodes} className={`${BTN_GHOST} flex-1`}><Download size={14} /> Λήψη .txt</button>
          </div>
          <button type="button" onClick={() => setBackupCodes(null)} className={`${BTN_PRIMARY} w-full`}>Τους αποθήκευσα</button>
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
                <input type="password" value={password} onChange={(event) => setPassword(event.target.value)}
                  placeholder="Ο κωδικός του λογαριασμού" autoComplete="current-password" className={INPUT} required
                  aria-label="Ο κωδικός του λογαριασμού" />
              )}
              {codeInput}
              {emailMethod && (
                <button type="button" onClick={sendManageCode} disabled={busy}
                  className="text-[11px] font-bold text-slate-400 hover:text-white">Αποστολή κωδικού στο email</button>
              )}
              <div className="flex gap-2">
                <button type="button" onClick={reset} className={`${BTN_GHOST} flex-1`}>Άκυρο</button>
                <button type="submit" disabled={busy} className={`${BTN_DANGER} flex-1`}>
                  {busy && <Loader2 size={14} className="animate-spin" />}
                  {manage === 'disable' ? 'Απενεργοποίηση' : 'Δημιουργία'}
                </button>
              </div>
            </form>
          )}
        </div>
      ) : !mode ? (
        <div className="space-y-3">
          <p className="text-[12px] leading-relaxed text-slate-400">
            Ενεργοποίησε δεύτερο κωδικό για επιπλέον προστασία του λογαριασμού.
          </p>
          <button type="button" onClick={() => setMode('choose')} className={`${BTN_PRIMARY} w-full`}>Ενεργοποίηση</button>
        </div>
      ) : mode === 'choose' ? (
        <div className="space-y-2">
          <button type="button" onClick={() => setMode('totp')} className={optionClass}>
            <p className="text-[12px] font-bold text-slate-200">Εφαρμογή authenticator</p>
            <p className="mt-0.5 text-[11px] text-slate-500">Google / Microsoft Authenticator, Authy, 1Password.</p>
          </button>
          <button type="button" onClick={() => setMode('email')} disabled={!status.email_available || !user?.email_verified}
            className={optionClass}>
            <p className="text-[12px] font-bold text-slate-200">Κωδικός στο email</p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              {user?.email_verified ? 'Κωδικός 6 ψηφίων σε κάθε σύνδεση.' : 'Επιβεβαίωσε πρώτα το email σου.'}
            </p>
          </button>
          <button type="button" onClick={reset} className="w-full py-1 text-[11px] font-bold text-slate-500 hover:text-white">Άκυρο</button>
        </div>
      ) : !setup ? (
        <form onSubmit={startSetup} className="space-y-2.5">
          <p className="text-[12px] text-slate-400">
            {hasPassword ? 'Για ασφάλεια, γράψε τον κωδικό του λογαριασμού σου.' : 'Επιβεβαίωσε ότι είσαι εσύ για να συνεχίσεις.'}
          </p>
          {hasPassword && (
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)}
              placeholder="Κωδικός λογαριασμού" autoComplete="current-password" className={INPUT}
              required aria-label="Κωδικός λογαριασμού" />
          )}
          <div className="flex gap-2">
            <button type="button" onClick={reset} className={`${BTN_GHOST} flex-1`}>Άκυρο</button>
            <button type="submit" disabled={busy} className={`${BTN_PRIMARY} flex-1`}>
              {busy && <Loader2 size={14} className="animate-spin" />} Συνέχεια
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={enable} className="space-y-3">
          {mode === 'totp' ? (
            <>
              <ol className="space-y-1.5 text-[12px] text-slate-400 [&>li]:ml-4 [&>li]:list-decimal">
                <li>Άνοιξε εφαρμογή authenticator.</li>
                <li>Σκάναρε το QR ή εισήγαγε το κλειδί.</li>
                <li>Γράψε τον κωδικό που εμφανίζεται.</li>
              </ol>
              {setup.qr && <img src={setup.qr} alt="Κωδικός QR για την εφαρμογή authenticator" className="mx-auto h-40 w-40 rounded-xl bg-white p-2" />}
              <p className="break-all rounded-lg border border-slate-800 bg-slate-900/70 p-2 text-center font-mono text-[12px] tracking-wider text-slate-200">
                {setup.secret.match(/.{1,4}/g).join(' ')}
              </p>
            </>
          ) : (
            <p className="text-[12px] text-slate-400">Γράψε τον κωδικό που στείλαμε στο {setup.email}.</p>
          )}
          <input value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
            inputMode="numeric" maxLength={6} autoComplete="one-time-code" placeholder="000000"
            className={`${INPUT} text-center font-mono text-lg tracking-[0.4em]`} aria-label="Κωδικός 6 ψηφίων" required />
          <div className="flex gap-2">
            <button type="button" onClick={reset} className={`${BTN_GHOST} flex-1`}>Άκυρο</button>
            <button type="submit" disabled={busy || code.length !== 6} className={`${BTN_PRIMARY} flex-1`}>
              {busy && <Loader2 size={14} className="animate-spin" />} Ενεργοποίηση
            </button>
          </div>
        </form>
      )}
    </Row>
  );
}

function SecurityLog() {
  const [events, setEvents] = useState(null);

  useEffect(() => {
    axios.get(`${API_BASE_URL}/api/me/security-events`)
      .then(({ data }) => setEvents(data.events || []))
      .catch((err) => {
        toast.error(apiErrorMessage(err, 'Αποτυχία φόρτωσης πρόσφατων συνδέσεων'));
        setEvents([]);
      });
  }, []);

  if (events === null) return <Loader2 size={15} className="animate-spin text-slate-500" />;
  return (
    <ul className="max-h-72 space-y-2.5 overflow-y-auto pr-1">
      {events.length === 0 && <li className="text-[12px] text-slate-500">Δεν υπάρχει δραστηριότητα.</li>}
      {events.map((event, index) => (
        <li key={`${event.at}-${index}`} className="flex items-start justify-between gap-3 text-[12px]">
          <div className="min-w-0">
            <p className={/failed|blocked/.test(event.event) ? 'text-red-300' : 'text-slate-200'}>{event.label}</p>
            <p className="truncate text-[11px] text-slate-500">{[event.client, event.ip].filter(Boolean).join(' · ')}</p>
          </div>
          <time className="shrink-0 text-[11px] text-slate-500" dateTime={event.at}>{formatDate(event.at, true)}</time>
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
    if (!open) return undefined;
    const esc = (e) => {
      if (e.key === 'Escape') {
        setPassword('');
        onClose();
      }
    };
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
      onMouseDown={(event) => { if (event.target === event.currentTarget) { setPassword(''); onClose(); } }}>
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
          <button type="button" onClick={() => { setPassword(''); onClose(); }} aria-label="Κλείσιμο" className="rounded-lg p-1 text-slate-500 hover:bg-slate-800 hover:text-white"><X size={15} /></button>
        </div>
        <form onSubmit={remove} className="mt-4 space-y-3">
          {hasPassword && (
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Ο κωδικός σου" aria-label="Ο κωδικός σου" className={INPUT} required autoFocus />
          )}
          <div className="flex gap-2">
            <button type="button" onClick={() => { setPassword(''); onClose(); }} className={`${BTN_GHOST} flex-1`}>Ακύρωση</button>
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
