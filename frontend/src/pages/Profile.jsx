import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { useClerk, useUser } from '@clerk/react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  ArrowLeft, ArrowUpRight, Camera, ChevronDown, FolderOpen, KeyRound, Loader2, LockKeyhole,
  LogOut, MonitorSmartphone, Pencil, Trash2, Users, X,
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

  const [name, setName] = useState(user?.display_name || '');
  const [school, setSchool] = useState(user?.school || '');
  const [company, setCompany] = useState(user?.company || '');
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [openRow, setOpenRow] = useState(null);
  // Νέα εικόνα προφίλ (προεπισκόπηση μέχρι την «Αποθήκευση») ή αφαίρεση της υπάρχουσας.
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const fileRef = useRef(null);
  useEffect(() => () => { if (avatarPreview) URL.revokeObjectURL(avatarPreview); }, [avatarPreview]);

  const [projects, setProjects] = useState({ owned: [], shared: [] });
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [tab, setTab] = useState('owned');

  useEffect(() => {
    axios.get(`${API_BASE_URL}/api/me/projects`)
      .then(({ data }) => setProjects({ owned: data.owned || [], shared: data.shared || [] }))
      .catch((err) => toast.error(apiErrorMessage(err, 'Αποτυχία φόρτωσης projects')))
      .finally(() => setProjectsLoading(false));
  }, []);

  const cleanName = name.trim().replace(/\s+/g, ' ');
  const dirty = useMemo(
    () => cleanName !== (user?.display_name || '') || school.trim() !== (user?.school || '')
      || company.trim() !== (user?.company || '') || Boolean(avatarFile) || removeAvatar,
    [cleanName, school, company, user, avatarFile, removeAvatar]
  );
  const hasAvatar = Boolean(user?.avatar_url || clerkUser?.hasImage);
  const shownAvatar = avatarPreview || (removeAvatar ? null : (user?.avatar_url || clerkUser?.imageUrl));

  const pickAvatar = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) { toast.error('Επιτρέπονται μόνο εικόνες PNG, JPG ή WEBP.'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Η εικόνα πρέπει να είναι μικρότερη από 5MB.'); return; }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setRemoveAvatar(false);
  };

  const clearAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    setRemoveAvatar(true);
  };

  const save = async (e) => {
    e.preventDefault();
    if (!cleanName) { toast.error('Το όνομα δεν μπορεί να είναι κενό.'); return; }
    setSaving(true);
    try {
      const nameChanged = cleanName !== (user?.display_name || '');
      const payload = new FormData();
      payload.append('display_name', cleanName);
      payload.append('school', school.trim());
      payload.append('company', company.trim());
      if (avatarFile) payload.append('avatar', avatarFile);
      let { data } = await axios.put(`${API_BASE_URL}/api/me`, payload);
      if (removeAvatar && !avatarFile && user?.avatar_url) {
        ({ data } = await axios.delete(`${API_BASE_URL}/api/me/avatar`));
      }
      // Ίδιο όνομα/εικόνα και στον λογαριασμό του Clerk (αλλιώς ένας συγχρονισμός από το Clerk θα έφερνε πίσω τα παλιά).
      if (clerkUser) {
        const syncs = [];
        const later = (fn) => syncs.push(Promise.resolve().then(fn));
        if (nameChanged) later(() => clerkUser.update({ unsafeMetadata: { ...(clerkUser.unsafeMetadata || {}), name: cleanName } }));
        if (avatarFile) later(() => clerkUser.setProfileImage({ file: avatarFile }));
        else if (removeAvatar && clerkUser.hasImage) later(() => clerkUser.setProfileImage({ file: null }));
        const results = await Promise.allSettled(syncs);
        if (results.some((r) => r.status === 'rejected')) console.warn('Clerk profile sync failed', results);
      }
      setUser(data);
      setName(data.display_name || '');
      setSchool(data.school || '');
      setCompany(data.company || '');
      setAvatarFile(null);
      setAvatarPreview(null);
      setRemoveAvatar(false);
      setIsEditing(false);
      toast.success('Το προφίλ αποθηκεύτηκε');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Αποτυχία αποθήκευσης'));
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    setName(user?.display_name || '');
    setAvatarFile(null);
    setAvatarPreview(null);
    setRemoveAvatar(false);
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
                <h2 id="settings-title">ΧΡΗΣΤΗΣ</h2>
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
                <div className="profile-id-avatar relative rounded-full">
                  <Avatar url={shownAvatar} name={cleanName || user?.display_name} size={86} />
                  {isEditing && (
                    <button type="button" onClick={() => fileRef.current?.click()} className="profile-avatar-edit"
                      aria-label="Αλλαγή εικόνας προφίλ" title="Αλλαγή εικόνας προφίλ">
                      <Camera size={18} aria-hidden="true" />
                    </button>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={pickAvatar} />
                {isEditing && (
                  <div className="profile-avatar-actions">
                    <button type="button" onClick={() => fileRef.current?.click()}>Αλλαγή</button>
                    {(avatarFile || (hasAvatar && !removeAvatar)) && (
                      <button type="button" onClick={clearAvatar} className="danger">Αφαίρεση</button>
                    )}
                  </div>
                )}
              </div>

              <div className="profile-id-fields">
                <form onSubmit={save} className="profile-id-edit-form">
                  <div className="profile-id-field">
                    <label className="profile-id-label" htmlFor="profile-name">Όνομα</label>
                    {isEditing ? (
                      <input id="profile-name" value={name} maxLength={60} required autoComplete="name"
                        onChange={(e) => setName(e.target.value)} className="l-input profile-id-input" placeholder="π.χ. Κώστας Τ." />
                    ) : (
                      <p className="profile-id-value profile-id-name">{user?.display_name || '—'}</p>
                    )}
                  </div>
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
                  subtitle="Αλλαγή κωδικού, email & ασφάλεια μέσω Clerk"
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
                <h2 id="devices-security-title">ΣΥΣΚΕΥΕΣ &amp; ΣΥΝΔΕΣΕΙΣ</h2>
              </div>
            </div>
            <div className="profile-id-security">
              <div className={`${CARD} l-card overflow-hidden`}>
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
