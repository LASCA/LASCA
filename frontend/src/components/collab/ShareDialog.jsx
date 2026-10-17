import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import {
  Check, ChevronDown, Copy, Crown, Link2, Loader2, LogOut, Share2, Trash2, UserMinus, UserPlus, X,
} from 'lucide-react';
import CollabAvatar from './CollabAvatar';
import { ROLE_HINT, ROLE_LABEL, apiError, timeAgo } from './collabApi';

const inputCls = 'h-10 rounded-xl border border-slate-700/70 bg-slate-950 px-3 text-sm text-slate-100 placeholder:text-slate-600 outline-none focus:border-[#5b74e6] focus:ring-2 focus:ring-[#3b5bdb]/30';
const selectCls = 'h-10 rounded-xl border border-slate-700/70 bg-[#0f172a] px-2.5 text-sm text-slate-100 transition-colors hover:border-slate-600 focus:border-[#5b74e6] focus:outline-none focus:ring-2 focus:ring-[#3b5bdb]/30';

function CustomSelect({ value, onChange, options, className = '', containerClassName = '', title }) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState(null);
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const selectedOption = options.find((option) => option.value === value) || options[0];

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target) && !menuRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;

    const updateMenuPosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const desiredHeight = Math.min(options.length * 40 + 8, window.innerHeight - 32);
      const spaceBelow = window.innerHeight - rect.bottom - 8;
      const spaceAbove = rect.top - 8;
      const openAbove = spaceBelow < desiredHeight && spaceAbove > spaceBelow;
      const availableHeight = Math.max(0, openAbove ? spaceAbove : spaceBelow);
      const height = Math.min(desiredHeight, availableHeight);

      setMenuStyle({
        left: rect.left,
        minWidth: rect.width,
        maxWidth: Math.max(rect.width, window.innerWidth - rect.left - 8),
        maxHeight: height,
        top: openAbove ? Math.max(8, rect.top - height - 4) : rect.bottom + 4,
      });
    };

    updateMenuPosition();
    window.addEventListener('resize', updateMenuPosition);
    window.addEventListener('scroll', updateMenuPosition, true);
    return () => {
      window.removeEventListener('resize', updateMenuPosition);
      window.removeEventListener('scroll', updateMenuPosition, true);
    };
  }, [isOpen, options.length]);

  if (!selectedOption) return null;

  return (
    <div ref={containerRef} className={`relative min-w-0 ${containerClassName}`}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        title={title}
        onClick={() => setIsOpen((open) => !open)}
        className={`flex w-full items-center justify-between gap-2 border bg-[#0f172a] text-left outline-none transition-colors hover:border-slate-600 focus:border-[#5b74e6] focus:ring-2 focus:ring-[#3b5bdb]/30 ${className}`}
      >
        <span className="truncate">{selectedOption.label}</span>
        <ChevronDown size={14} className={`shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && menuStyle && createPortal(
        <div
          ref={menuRef}
          role="listbox"
          style={{ ...menuStyle, position: 'fixed' }}
          className="z-[140] overflow-y-auto rounded-xl border border-slate-700 bg-[#0f172a] py-1.5 shadow-2xl"
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`block w-full rounded-lg px-3 py-1.5 text-left text-sm text-slate-100 transition-colors hover:bg-slate-800 focus:bg-slate-800 focus:outline-none ${option.value === value ? 'bg-slate-800/70' : ''}`}
            >
              {option.label}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </div>
  );
}

function RoleBadge({ role }) {
  const colors = {
    owner: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
    editor: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
    viewer: 'border-slate-600 bg-slate-800/70 text-slate-300',
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${colors[role] || colors.viewer}`}>
      {role === 'owner' && <Crown size={10} />}{ROLE_LABEL[role] || role}
    </span>
  );
}

/**
 * Κοινοποίηση project: μέλη με ρόλους, προσθήκη με email, σύνδεσμοι πρόσκλησης,
 * μεταβίβαση ιδιοκτησίας, αποχώρηση. Ίδιο component στη σελίδα και στο exe (api = createCollabApi(prefix)).
 */
export default function ShareDialog({ isOpen, onClose, api, projectId, projectName, currentUserId, onLeft, onRoleChanged, onMembersChanged }) {
  const [members, setMembers] = useState([]);
  const [myRole, setMyRole] = useState(null);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [newRole, setNewRole] = useState('editor');
  const [busy, setBusy] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [invites, setInvites] = useState([]);
  const [inviteRole, setInviteRole] = useState('editor');
  const [inviteDays, setInviteDays] = useState('7');
  const [copiedId, setCopiedId] = useState(null);
  const [confirm, setConfirm] = useState(null); // { kind: 'transfer'|'remove'|'leave', member }
  const lookupTimer = useRef(null);
  // Το callback κρατιέται σε ref: αν ήταν εξάρτηση του load, κάθε νέα απόδοση του γονέα θα
  // ξαναφόρτωνε τα μέλη → ατελείωτος κύκλος (το παράθυρο «αναβόσβηνε»).
  const onRoleChangedRef = useRef(onRoleChanged);
  onRoleChangedRef.current = onRoleChanged;
  const onMembersChangedRef = useRef(onMembersChanged);
  onMembersChangedRef.current = onMembersChanged;
  // Το κουμπί «Κοινοποίηση» της μπάρας δείχνει ποιοι έχουν πρόσβαση: το ενημερώνουμε σε κάθε αλλαγή.
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { if (isOpen && loaded) onMembersChangedRef.current?.(members); }, [members, isOpen, loaded]);
  useEffect(() => { if (!isOpen) setLoaded(false); }, [isOpen]);

  const isOwner = myRole === 'owner';

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const data = await api.members(projectId);
      setMembers(data.members || []);
      setLoaded(true);
      setMyRole(data.project?.role || null);
      onRoleChangedRef.current?.(data.project?.role || null);
      if (data.project?.role === 'owner') {
        const inv = await api.invites(projectId);
        setInvites(inv.invites || []);
      } else {
        setInvites([]);
      }
    } catch (error) {
      toast.error(apiError(error, 'Αποτυχία φόρτωσης μελών'));
    } finally {
      setLoading(false);
    }
  }, [api, projectId]);

  useEffect(() => {
    if (isOpen) { load(); setConfirm(null); }
  }, [isOpen, load]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  // Προτάσεις συνεργατών καθώς γράφεις
  useEffect(() => {
    clearTimeout(lookupTimer.current);
    const q = email.trim();
    if (!isOpen || !isOwner || q.length < 2) { setSuggestions([]); return undefined; }
    lookupTimer.current = setTimeout(async () => {
      try {
        const data = await api.lookup(q);
        const existing = new Set(members.map((m) => m.email));
        setSuggestions((data.users || []).filter((u) => !existing.has(u.email)).slice(0, 5));
      } catch { setSuggestions([]); }
    }, 250);
    return () => clearTimeout(lookupTimer.current);
  }, [email, isOpen, isOwner, api, members]);

  const addMember = async (e) => {
    e?.preventDefault();
    const target = email.trim();
    if (!target) return;
    setBusy(true);
    try {
      const data = await api.addMember(projectId, target, newRole);
      setMembers(data.members || []);
      setEmail(''); setSuggestions([]);
      toast.success(`Το project κοινοποιήθηκε στον/στην ${target}`);
    } catch (error) {
      toast.error(apiError(error, 'Αποτυχία κοινοποίησης'));
    } finally { setBusy(false); }
  };

  const changeRole = async (member, role) => {
    try {
      const data = await api.changeRole(projectId, member.id, role);
      setMembers(data.members || []);
      toast.success(`${member.display_name}: ${ROLE_LABEL[role]}`);
    } catch (error) { toast.error(apiError(error)); }
  };

  const doConfirmed = async () => {
    if (!confirm) return;
    const { kind, member } = confirm;
    setBusy(true);
    try {
      if (kind === 'remove') {
        const data = await api.removeMember(projectId, member.id);
        setMembers(data.members || []);
        toast.success(`${member.display_name} αφαιρέθηκε`);
      } else if (kind === 'transfer') {
        const data = await api.transfer(projectId, member.id);
        setMembers(data.members || []);
        setMyRole(data.project?.role || 'editor');
        onRoleChangedRef.current?.(data.project?.role || 'editor');
        setInvites([]);
        toast.success(`Ο/Η ${member.display_name} είναι πλέον ιδιοκτήτης`);
      } else if (kind === 'leave') {
        await api.leave(projectId);
        toast.success('Αποχώρησες από το project');
        onLeft?.();
        onClose();
      }
    } catch (error) {
      toast.error(apiError(error));
    } finally { setBusy(false); setConfirm(null); }
  };

  const createInvite = async () => {
    setBusy(true);
    try {
      const data = await api.createInvite(projectId, { role: inviteRole, days: inviteDays === 'never' ? null : Number(inviteDays) });
      setInvites((prev) => [data.invite, ...prev]);
      await copy(data.invite);
    } catch (error) { toast.error(apiError(error)); } finally { setBusy(false); }
  };

  const copy = async (invite) => {
    try {
      await navigator.clipboard.writeText(invite.url);
      setCopiedId(invite.id);
      setTimeout(() => setCopiedId(null), 1800);
      toast.success('Ο σύνδεσμος αντιγράφηκε');
    } catch {
      window.prompt('Αντίγραψε τον σύνδεσμο:', invite.url);
    }
  };

  const revoke = async (invite) => {
    try {
      await api.revokeInvite(projectId, invite.id);
      setInvites((prev) => prev.filter((i) => i.id !== invite.id));
      toast.success('Ο σύνδεσμος ακυρώθηκε');
    } catch (error) { toast.error(apiError(error)); }
  };

  const confirmText = useMemo(() => {
    if (!confirm) return '';
    const n = confirm.member?.display_name;
    if (confirm.kind === 'remove') return `Να αφαιρεθεί ο/η ${n} από το project;`;
    if (confirm.kind === 'transfer') return `Ο/Η ${n} θα γίνει ιδιοκτήτης. Εσύ θα μείνεις επεξεργαστής και δεν θα μπορείς να διαχειρίζεσαι μέλη. Συνέχεια;`;
    return 'Να αποχωρήσεις από το project; Θα χρειαστείς νέα πρόσκληση για να ξαναμπείς.';
  }, [confirm]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4" onMouseDown={onClose}>
      <div className="w-full max-w-xl max-h-[90vh] flex flex-col rounded-2xl border border-slate-800 bg-[#0f172a] shadow-2xl overflow-hidden"
        onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Share2 size={17} className="text-indigo-400 shrink-0" />
              <span className="truncate">Κοινοποίηση: {projectName}</span>
            </h2>
            {myRole && <p className="mt-0.5 text-[11px] text-slate-500">Ο ρόλος σου: {ROLE_LABEL[myRole]}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Κλείσιμο"
            className="p-1.5 rounded-lg border border-slate-700/60 bg-slate-900/70 text-slate-400 hover:text-slate-100 hover:bg-slate-800">
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-6">
          {/* --- Προσθήκη με email --- */}
          {isOwner && (
            <section>
              <h3 className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400 mb-2">Πρόσθεσε συνεργάτη</h3>
              <form onSubmit={addMember} className="relative flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off"
                    placeholder="email συνεργάτη" className={`${inputCls} w-full`} />
                  {suggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-11 z-10 rounded-xl border border-slate-700 bg-slate-950 shadow-2xl overflow-hidden">
                      {suggestions.map((s) => (
                        <button type="button" key={s.email} onClick={() => { setEmail(s.email); setSuggestions([]); }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-slate-800/80">
                          <CollabAvatar user={s} src={api.asset(s.avatar_url)} size={24} />
                          <span className="min-w-0">
                            <span className="block text-sm text-slate-100 truncate">{s.display_name}</span>
                            <span className="block text-[11px] text-slate-500 truncate">{s.email}{s.known ? ' · συνεργάτης' : ''}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <CustomSelect
                  value={newRole}
                  onChange={setNewRole}
                  options={[
                    { value: 'editor', label: 'Επεξεργαστής' },
                    { value: 'viewer', label: 'Αναγνώστης' },
                  ]}
                  className={selectCls}
                  title={ROLE_HINT[newRole]}
                />
                <button type="submit" disabled={busy || !email.trim()}
                  className="h-10 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-400 px-4 text-sm font-bold text-white">
                  {busy ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />} Προσθήκη
                </button>
              </form>
              <p className="mt-1.5 text-[11px] text-slate-500">{ROLE_HINT[newRole]}. Αν δεν έχει λογαριασμό, στείλε του σύνδεσμο πρόσκλησης.</p>
            </section>
          )}

          {/* --- Μέλη --- */}
          <section>
            <h3 className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400 mb-2">Μέλη με πρόσβαση</h3>
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-slate-400"><Loader2 size={14} className="animate-spin" /> Φόρτωση...</div>
            ) : (
              <ul className="space-y-2">
                {members.map((m) => {
                  const isMe = m.id === currentUserId;
                  return (
                    <li key={m.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <CollabAvatar user={m} src={api.asset(m.avatar_url)} size={30} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-100 truncate">{m.display_name}{isMe ? ' (εσύ)' : ''}</p>
                          <p className="text-[11px] text-slate-500 truncate">
                            {m.email}{m.last_seen_at ? ` · ενεργός ${timeAgo(m.last_seen_at)}` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isOwner && m.role !== 'owner' ? (
                          <>
                            <CustomSelect
                              value={m.role}
                              onChange={(role) => changeRole(m, role)}
                              options={[
                                { value: 'editor', label: 'Επεξεργαστής' },
                                { value: 'viewer', label: 'Αναγνώστης' },
                              ]}
                              className="h-8 min-w-[132px] rounded-lg border-slate-700 px-1.5 text-xs text-slate-200"
                            />
                            <button type="button" title="Να γίνει ιδιοκτήτης" onClick={() => setConfirm({ kind: 'transfer', member: m })}
                              className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-slate-700 text-amber-300 hover:bg-amber-500/10">
                              <Crown size={14} />
                            </button>
                            <button type="button" title="Αφαίρεση" onClick={() => setConfirm({ kind: 'remove', member: m })}
                              className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-red-500/30 text-red-300 hover:bg-red-500/10">
                              <UserMinus size={14} />
                            </button>
                          </>
                        ) : (
                          <RoleBadge role={m.role} />
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* --- Σύνδεσμοι πρόσκλησης --- */}
          {isOwner && (
            <section>
              <h3 className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400 mb-2">Σύνδεσμος πρόσκλησης</h3>
              <div className="flex flex-col sm:flex-row gap-2">
                <CustomSelect
                  value={inviteRole}
                  onChange={setInviteRole}
                  options={[
                    { value: 'editor', label: 'ως Επεξεργαστής' },
                    { value: 'viewer', label: 'ως Αναγνώστης' },
                  ]}
                  className={selectCls}
                  containerClassName="flex-1"
                />
                <CustomSelect
                  value={inviteDays}
                  onChange={setInviteDays}
                  options={[
                    { value: '1', label: 'λήγει σε 1 μέρα' },
                    { value: '7', label: 'λήγει σε 7 μέρες' },
                    { value: '30', label: 'λήγει σε 30 μέρες' },
                    { value: 'never', label: 'χωρίς λήξη' },
                  ]}
                  className={selectCls}
                  containerClassName="flex-1"
                />
                <button type="button" onClick={createInvite} disabled={busy}
                  className="h-10 inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-500/40 bg-indigo-500/10 px-4 text-sm font-bold text-indigo-200 hover:bg-indigo-500/20">
                  <Link2 size={15} /> Νέος σύνδεσμος
                </button>
              </div>
              <p className="mt-1.5 text-[11px] text-slate-500">Όποιος έχει τον σύνδεσμο και λογαριασμό LASCA μπαίνει στο project. Μοιράσου τον μόνο με όσους θέλεις.</p>
              {invites.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {invites.map((inv) => (
                    <li key={inv.id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2">
                      <div className="min-w-0">
                        <p className="text-xs font-mono text-slate-300 truncate">{inv.url}</p>
                        <p className="text-[11px] text-slate-500">
                          {ROLE_LABEL[inv.role]} · {inv.expires_at ? `λήγει ${new Date(inv.expires_at).toLocaleDateString('el-GR')}` : 'χωρίς λήξη'}
                          {inv.uses ? ` · χρησιμοποιήθηκε ${inv.uses}×` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button type="button" onClick={() => copy(inv)} title="Αντιγραφή"
                          className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800">
                          {copiedId === inv.id ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                        </button>
                        <button type="button" onClick={() => revoke(inv)} title="Ακύρωση συνδέσμου"
                          className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-red-500/30 text-red-300 hover:bg-red-500/10">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {!isOwner && myRole && (
            <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-3 text-sm text-slate-400">
              Μόνο ο ιδιοκτήτης μπορεί να προσθέτει μέλη και να φτιάχνει συνδέσμους πρόσκλησης.
              <button type="button" onClick={() => setConfirm({ kind: 'leave' })}
                className="mt-3 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-300 hover:bg-red-500/20">
                <LogOut size={14} /> Αποχώρηση από το project
              </button>
            </section>
          )}
        </div>

        {confirm && (
          <div className="border-t border-slate-800 bg-slate-900/80 px-5 py-4">
            <p className="text-sm text-slate-200">{confirmText}</p>
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" onClick={() => setConfirm(null)} className="h-9 rounded-lg px-3 text-sm text-slate-300 hover:bg-slate-800">Άκυρο</button>
              <button type="button" onClick={doConfirmed} disabled={busy}
                className="h-9 inline-flex items-center gap-2 rounded-lg bg-red-600 hover:bg-red-500 px-4 text-sm font-bold text-white">
                {busy && <Loader2 size={14} className="animate-spin" />} Επιβεβαίωση
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
