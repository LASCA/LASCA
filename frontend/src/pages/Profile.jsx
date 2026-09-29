import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { ArrowLeft, Camera, FolderOpen, KeyRound, Loader2, LogOut, MonitorSmartphone, ShieldAlert, Trash2, Users } from 'lucide-react';
import { API_BASE_URL } from '../config';
import { apiErrorMessage, useAuth } from '../auth/AuthContext';
import LascaLogo, { WIDGET_HOVER } from '../components/brand/LascaLogo';

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const ROLE_LABEL = { owner: 'Ιδιοκτήτης', editor: 'Επεξεργαστής', viewer: 'Αναγνώστης' };
const fieldCls = 'w-full h-11 rounded-xl border border-slate-700/70 bg-slate-950/70 px-3.5 text-sm text-slate-100 outline-none focus:border-[#5b74e6] focus:ring-2 focus:ring-[#3b5bdb]/30';

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('el-GR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function Avatar({ url, name, size = 96 }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [url]);
  const initials = (name || 'U').trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
  if (!url || failed) {
    return (
      <div style={{ width: size, height: size }}
        className="flex items-center justify-center rounded-full bg-gradient-to-br from-[#d93a44] to-[#3b5bdb] text-2xl font-black text-white">
        {initials}
      </div>
    );
  }
  return <img src={url} alt="" style={{ width: size, height: size }} onError={() => setFailed(true)}
    className="rounded-full object-cover" />;
}

export default function Profile() {
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

  // Καθαρισμός του προσωρινού URL της προεπισκόπησης.
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
    // Το App διαβάζει το ενεργό project από εδώ όταν ανοίγει.
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
    <div className="h-full overflow-y-auto bg-slate-950 text-slate-200">
      <header className="sticky top-0 z-20 border-b border-slate-800/70 bg-slate-950/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <Link to="/app" className="inline-flex h-9 shrink-0 items-center gap-2 rounded-xl border border-slate-700/60 bg-slate-900/80 px-3 text-xs font-bold text-slate-200 hover:bg-slate-800">
              <ArrowLeft size={15} /> <span className="hidden sm:inline">Πίσω στην εφαρμογή</span>
            </Link>
            <span className="hidden sm:inline-flex"><LascaLogo height={26} textClass="text-lg" /></span>
            <span className="sm:hidden inline-flex"><LascaLogo height={26} withText={false} /></span>
          </div>
          <button onClick={handleLogout}
            className="inline-flex h-9 shrink-0 items-center gap-2 rounded-xl px-3 text-xs font-bold text-rose-300 hover:bg-rose-500/10">
            <LogOut size={15} /> Αποσύνδεση
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-10 grid gap-8 lg:grid-cols-[320px_1fr]">
        <div className="h-fit space-y-6">
        {/* --- Στοιχεία χρήστη --- */}
        <form onSubmit={save} className="h-fit rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="flex flex-col items-center text-center">
            <button type="button" onClick={() => fileInput.current?.click()}
              className="group relative rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3b5bdb]"
              aria-label="Αλλαγή εικόνας προφίλ">
              <Avatar url={avatarPreview || user?.avatar_url} name={displayName || user?.display_name} size={104} />
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-slate-950/60 opacity-0 transition group-hover:opacity-100">
                <Camera size={22} className="text-white" />
              </span>
            </button>
            <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
              onChange={(e) => { pickAvatar(e.target.files?.[0]); e.target.value = ''; }} />
            <p className="mt-3 text-[11px] text-slate-500">PNG, JPG ή WEBP, έως 5MB · κόβεται τετράγωνη</p>
            {user?.avatar_url && !avatarPreview && (
              <button type="button" onClick={removeAvatar} className="mt-1 text-[11px] text-slate-500 hover:text-rose-300">
                Αφαίρεση εικόνας
              </button>
            )}
          </div>

          <div className="mt-6 space-y-1.5">
            <label htmlFor="display_name" className="block text-[11px] font-bold tracking-wider text-slate-400">ΟΝΟΜΑ ΧΡΗΣΤΗ</label>
            <input id="display_name" value={displayName} maxLength={150}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full h-11 rounded-xl border border-slate-700/70 bg-slate-950/70 px-3.5 text-sm text-slate-100 outline-none focus:border-[#5b74e6] focus:ring-2 focus:ring-[#3b5bdb]/30" />
          </div>
          <div className="mt-4 space-y-1.5">
            <p className="text-[11px] font-bold tracking-wider text-slate-400">EMAIL</p>
            <p className="truncate text-sm text-slate-300" title={user?.email}>{user?.email}</p>
          </div>

          <button type="submit" disabled={!dirty || saving}
            className="mt-6 w-full h-11 rounded-xl bg-gradient-to-r from-[#d93a44] to-[#3b5bdb] text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-40 flex items-center justify-center gap-2">
            {saving && <Loader2 size={16} className="animate-spin" />}
            Αποθήκευση αλλαγών
          </button>
        </form>
        <SecurityCard user={user} setUser={setUser} />
        <DangerZone user={user} onDeleted={() => { setUser(null); navigate('/', { replace: true }); }} />
        </div>

        {/* --- Projects --- */}
        <section className="min-w-0">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-slate-50">Τα projects μου</h1>
              <p className="mt-1 text-sm text-slate-400">
                {projects.owned.length} δικά σου · {projects.shared.length} κοινοποιημένα σε εσένα
                {projects.stats ? ` · ${projects.stats.collaborators} συνεργάτες` : ''}
              </p>
            </div>
            <div className="inline-flex rounded-xl border border-slate-800 bg-slate-900/60 p-1 text-xs font-bold">
              {[['owned', 'Δικά μου'], ['shared', 'Κοινά']].map(([key, label]) => (
                <button key={key} type="button" onClick={() => setTab(key)}
                  className={`h-8 rounded-lg px-4 transition ${tab === key ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-100'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6">
            {projectsLoading ? (
              <div className="flex items-center gap-2 py-16 justify-center text-sm text-slate-500">
                <Loader2 size={16} className="animate-spin" /> Φόρτωση...
              </div>
            ) : list.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-800 py-16 text-center">
                <FolderOpen size={28} className="mx-auto text-slate-600" />
                <p className="mt-3 text-sm text-slate-400">
                  {tab === 'owned' ? 'Δεν έχεις δημιουργήσει ακόμα project.' : 'Κανείς δεν έχει κοινοποιήσει project σε εσένα.'}
                </p>
                {tab === 'owned' && (
                  <Link to="/app" className="mt-4 inline-block text-sm font-bold text-slate-100 hover:underline">
                    Δημιούργησε το πρώτο σου project
                  </Link>
                )}
              </div>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {list.map((p) => (
                  <li key={p.name}>
                    <button type="button" onClick={() => openProject(p.name)}
                      className={`w-full text-left rounded-2xl border border-slate-800 bg-slate-900/40 p-4 ${WIDGET_HOVER}`}>
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-bold text-slate-100 truncate">{p.name}</p>
                        {tab === 'shared' && (
                          <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${p.role === 'viewer' ? 'bg-slate-800 text-slate-300' : 'bg-sky-500/10 text-sky-300'}`}>
                            {ROLE_LABEL[p.role] || p.role}
                          </span>
                        )}
                        {p.members_count > 1 && (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-300">
                            <Users size={11} /> {p.members_count}
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-xs text-slate-500">
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


// --- Ασφάλεια: κωδικός και συσκευές ---
function SecurityCard({ user, setUser }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirmNext, setConfirmNext] = useState('');
  const [busy, setBusy] = useState(false);
  const hasPassword = user?.has_password !== false;

  const changePassword = async (e) => {
    e.preventDefault();
    if (next.length < 8) return toast.error('Ο νέος κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες');
    if (next !== confirmNext) return toast.error('Οι κωδικοί δεν ταιριάζουν');
    setBusy(true);
    try {
      const { data } = await axios.post(`${API_BASE_URL}/api/me/password`, { current_password: current, new_password: next });
      setUser(data);
      setCurrent(''); setNext(''); setConfirmNext('');
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
    <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
      <h2 className="flex items-center gap-2 text-sm font-bold text-slate-100"><KeyRound size={16} /> {hasPassword ? 'Αλλαγή κωδικού' : 'Ορισμός κωδικού'}</h2>
      {!hasPassword && (
        <p className="mt-2 text-xs text-slate-400">Μπαίνεις με Google. Όρισε κωδικό για να συνδέεσαι και με email ή από το πρόγραμμα των Windows.</p>
      )}
      <form onSubmit={changePassword} className="mt-4 space-y-3">
        {hasPassword && (
          <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="Τρέχων κωδικός" autoComplete="current-password" className={fieldCls} required />
        )}
        <input type="password" value={next} onChange={(e) => setNext(e.target.value)} placeholder="Νέος κωδικός (8+ χαρακτήρες)" autoComplete="new-password" className={fieldCls} required />
        <input type="password" value={confirmNext} onChange={(e) => setConfirmNext(e.target.value)} placeholder="Επιβεβαίωση νέου κωδικού" autoComplete="new-password" className={fieldCls} required />
        <button type="submit" disabled={busy}
          className="w-full h-10 rounded-xl border border-slate-600 text-sm font-bold text-slate-100 hover:bg-slate-800 disabled:opacity-50 flex items-center justify-center gap-2">
          {busy && <Loader2 size={15} className="animate-spin" />} {hasPassword ? 'Αλλαγή κωδικού' : 'Ορισμός κωδικού'}
        </button>
      </form>
      <button type="button" onClick={logoutEverywhere}
        className="mt-4 w-full h-10 rounded-xl text-sm font-bold text-slate-300 hover:bg-slate-800 flex items-center justify-center gap-2">
        <MonitorSmartphone size={15} /> Αποσύνδεση από όλες τις άλλες συσκευές
      </button>
    </section>
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
    <section className="rounded-2xl border border-rose-500/25 bg-rose-500/[0.04] p-6">
      <h2 className="flex items-center gap-2 text-sm font-bold text-rose-200"><ShieldAlert size={16} /> Διαγραφή λογαριασμού</h2>
      <p className="mt-2 text-xs text-slate-400">
        Σβήνονται ο λογαριασμός, η εικόνα σου και τα projects που έχεις μόνο εσύ. Όσα projects έχουν κι άλλα μέλη
        δεν χάνονται: περνάνε στον πρώτο συνεργάτη.
      </p>
      {!open ? (
        <button type="button" onClick={() => setOpen(true)}
          className="mt-4 w-full h-10 rounded-xl border border-rose-500/40 text-sm font-bold text-rose-300 hover:bg-rose-500/10 flex items-center justify-center gap-2">
          <Trash2 size={15} /> Διαγραφή λογαριασμού
        </button>
      ) : (
        <form onSubmit={remove} className="mt-4 space-y-3">
          {hasPassword && (
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Ο κωδικός σου" className={fieldCls} required />
          )}
          <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="Γράψε ΔΙΑΓΡΑΦΗ" className={fieldCls} required />
          <div className="flex gap-2">
            <button type="button" onClick={() => setOpen(false)} className="flex-1 h-10 rounded-xl text-sm text-slate-300 hover:bg-slate-800">Άκυρο</button>
            <button type="submit" disabled={busy || confirmText.trim().toUpperCase() !== 'ΔΙΑΓΡΑΦΗ'}
              className="flex-1 h-10 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-sm font-bold text-white flex items-center justify-center gap-2">
              {busy && <Loader2 size={15} className="animate-spin" />} Οριστική διαγραφή
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
