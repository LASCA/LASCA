import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, ArrowUpRight, ChevronDown, Clock, CloudOff, Eye, Loader2, Monitor } from 'lucide-react';
import CollabAvatar from './CollabAvatar';
import { TOOL_LABEL, describeActivity, describeChange, sectionCounts, timeAgo } from './collabApi';

const SIGN_CLASS = { '+': 'text-[#5fd3bf]', '−': 'text-[#ff9b80]', '~': 'text-blueprint' };

/** Οι λεπτομέρειες μιας αποθήκευσης: ποιες ενότητες άλλαξαν και πώς. */
function ChangeDetails({ sections = [], onOpenTool }) {
  return (
    <ul className="mt-2 space-y-2">
      {sections.map((sec) => (
        <li key={`${sec.key}-${sec.label}`} className="rounded-lg border border-glass-edge bg-glass-fill px-2.5 py-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-bold text-frost truncate">{sec.label}</p>
            {onOpenTool && sec.tool && (
              <button type="button" onClick={() => onOpenTool(sec.tool)} title={`Άνοιγμα: ${TOOL_LABEL[sec.tool] || sec.label}`}
                className="shrink-0 inline-flex items-center gap-0.5 text-[10px] text-fog hover:text-white">
                Άνοιγμα <ArrowUpRight size={11} aria-hidden="true" />
              </button>
            )}
          </div>
          <p className="text-[10.5px] text-fog">{sectionCounts(sec)}</p>
          {sec.changes?.length > 0 && (
            <ul className="mt-1.5 space-y-0.5 font-mono text-[10.5px] leading-snug">
              {sec.changes.map((c, i) => {
                const d = describeChange(c);
                return (
                  <li key={i} className="flex gap-1.5 text-mist">
                    <span className={`w-2.5 shrink-0 text-center font-bold ${SIGN_CLASS[d.sign]}`} aria-hidden="true">{d.sign}</span>
                    <span className="min-w-0 break-words">{d.text}</span>
                  </li>
                );
              })}
              {sec.more > 0 && <li className="pl-4 text-fog">και {sec.more} ακόμα</li>}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}

function ActivityItem({ a, isNew, asset, onOpenTool, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen);
  const sections = a.action === 'saved' ? (a.detail?.sections || []) : [];
  return (
    <div className={`relative flex items-start gap-2.5 px-3 py-2.5 border-b border-slate-900 last:border-0 ${isNew ? 'bg-[#663af3]/[0.07]' : ''}`}>
      {isNew && <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-[#7650f5]" aria-hidden="true" />}
      <CollabAvatar user={a.user} src={asset(a.user?.avatar_url)} size={24} className="mt-0.5" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-200 leading-snug">
          {describeActivity(a)}
          {isNew && <span className="ml-1.5 align-middle rounded-full bg-[#663af3]/30 px-1.5 py-px text-[9px] font-bold uppercase tracking-wider text-[#cbbcff]">νέο</span>}
        </p>
        <p className="mt-0.5 flex items-center gap-1.5 text-[10px] text-slate-500">
          {timeAgo(a.at)}
          {a.detail?.client === 'desktop' && <span className="inline-flex items-center gap-1"><Monitor size={10} aria-hidden="true" /> πρόγραμμα Windows</span>}
        </p>
        {sections.length > 0 && (
          <>
            <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}
              className="mt-1 inline-flex items-center gap-1 text-[10.5px] font-semibold text-blueprint hover:text-white">
              {open ? 'Λιγότερα' : 'Τι άλλαξε'}
              <ChevronDown size={11} className={`transition-transform duration-150 ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>
            {open && <ChangeDetails sections={sections} onOpenTool={onOpenTool} />}
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Μικρή μπάρα δίπλα στο «Project»: ποιοι άλλοι είναι μέσα τώρα, ιστορικό αλλαγών (με μετρητή νέων
 * αλλαγών πάνω στο εικονίδιο), ένδειξη «μόνο ανάγνωση» και «offline». Ίδιο component στη σελίδα και στο exe.
 */
export function LiveBar({
  presence = [], activity = [], readOnly, online = true, pending = false, asset = (u) => u, itemClass = '',
  unread = 0, lastSeen = 0, onOpenHistory, onOpenTool, currentUserId,
}) {
  const [open, setOpen] = useState(false);
  const [seenAtOpen, setSeenAtOpen] = useState(0);
  const ref = useRef(null);
  const panelRef = useRef(null);
  const [pos, setPos] = useState(null);
  const others = presence.filter((p) => !p.self);
  const selfId = currentUserId ?? presence.find((p) => p.self)?.id;

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => {
      if (ref.current?.contains(e.target) || panelRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);

  // Το παράθυρο ζωγραφίζεται στο <body> (portal), πάνω από όλα: αλλιώς οι πίνακες των εργαλείων
  // (sticky headers με δικό τους z-index) περνούσαν από πάνω του.
  useLayoutEffect(() => {
    if (!open) return undefined;
    const place = () => {
      const r = ref.current?.getBoundingClientRect();
      if (r) setPos({ top: r.bottom + 8, right: Math.max(8, window.innerWidth - r.right) });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true); };
  }, [open]);

  // Όσο είναι ανοιχτό, ό,τι νέο έρχεται διαβάζεται αμέσως.
  useEffect(() => { if (open && unread > 0) onOpenHistory?.(); }, [open, unread, onOpenHistory]);

  const toggle = () => {
    if (!open) { setSeenAtOpen(lastSeen); onOpenHistory?.(); }
    setOpen((v) => !v);
  };
  const isNew = (a) => a.id > seenAtOpen && a.user?.id !== selfId;
  const newCount = activity.filter(isNew).length;
  const badge = unread > 99 ? '99+' : String(unread);

  return (
    <div className="flex items-center gap-2 shrink-0">
      {!online && (
        <span className={`${itemClass} px-3 border-amber-500/30 bg-amber-500/10 text-amber-300`}
          title={pending ? 'Χωρίς σύνδεση: οι αλλαγές σου θα ανέβουν μόλις επανέλθει το internet' : 'Χωρίς σύνδεση με τον server'}>
          <CloudOff size={14} /> <span className="hidden xl:inline">Offline{pending ? ' · εκκρεμούν αλλαγές' : ''}</span>
        </span>
      )}
      {readOnly && (
        <span className={`${itemClass} px-3 border-slate-600 bg-slate-800/70 text-slate-300`}
          title="Είσαι αναγνώστης: βλέπεις το project, αλλά οι αλλαγές σου δεν αποθηκεύονται">
          <Eye size={14} /> <span className="hidden xl:inline">Μόνο ανάγνωση</span>
        </span>
      )}
      {others.length > 0 && (
        <div className="hidden md:flex -space-x-2" aria-label="Συνεργάτες online">
          {others.slice(0, 4).map((p) => (
            <span key={p.id} className="relative" title={`${p.display_name} · ${TOOL_LABEL[p.tool] || p.tool || 'online'}${p.client === 'desktop' ? ' · πρόγραμμα Windows' : ''}`}>
              <CollabAvatar user={p} src={asset(p.avatar_url)} size={30} ring />
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-950" />
            </span>
          ))}
          {others.length > 4 && (
            <span className="h-[30px] w-[30px] rounded-full bg-slate-800 ring-2 ring-slate-950 text-[10px] font-bold text-slate-200 flex items-center justify-center">
              +{others.length - 4}
            </span>
          )}
        </div>
      )}
      <div className="relative" ref={ref}>
        <button type="button" onClick={toggle} aria-expanded={open} aria-haspopup="dialog"
          title={unread > 0 ? `Ιστορικό αλλαγών · ${unread} ${unread === 1 ? 'νέα αλλαγή' : 'νέες αλλαγές'}` : 'Ιστορικό αλλαγών'}
          aria-label={unread > 0 ? `Ιστορικό αλλαγών, ${unread} ${unread === 1 ? 'νέα αλλαγή' : 'νέες αλλαγές'}` : 'Ιστορικό αλλαγών'}
          className={`${itemClass} relative px-2.5 ${unread > 0 ? 'border-[#663af3]/50 bg-[#663af3]/15 text-white hover:bg-[#663af3]/25' : 'border-slate-700/50 bg-slate-900/80 text-slate-300 hover:bg-slate-800'}`}>
          <Clock size={15} />
          {unread > 0 && (
            <span key={badge} className="absolute -top-1.5 -right-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#e46d4c] px-1 text-[10px] font-bold leading-none text-white ring-2 ring-slate-950 animate-pop">
              <span className="absolute inset-0 rounded-full bg-[#e46d4c] opacity-60 motion-safe:animate-ping motion-safe:[animation-iteration-count:2]" aria-hidden="true" />
              <span className="relative">{badge}</span>
            </span>
          )}
        </button>
        {open && pos && createPortal(
          <div role="dialog" aria-label="Ιστορικό αλλαγών" ref={panelRef} style={{ top: pos.top, right: pos.right }}
            className="fixed w-[360px] max-w-[calc(100vw-1rem)] max-h-[70vh] overflow-y-auto rounded-xl border border-slate-700/60 bg-slate-950/95 shadow-2xl backdrop-blur-sm z-[130] origin-top-right animate-pop">
            <div className="sticky top-0 z-10 flex items-center justify-between gap-2 bg-slate-950/95 px-3 py-2 border-b border-slate-800">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Ιστορικό αλλαγών</p>
              {newCount > 0 && <span className="rounded-full bg-[#663af3]/25 px-2 py-0.5 text-[10px] font-bold text-[#cbbcff]">{newCount} {newCount === 1 ? 'νέα' : 'νέες'}</span>}
            </div>
            {activity.length === 0 ? (
              <p className="px-3 py-4 text-sm text-slate-500">Τίποτα ακόμα.</p>
            ) : activity.map((a, i) => (
              <ActivityItem key={a.id} a={a} isNew={isNew(a)} asset={asset} defaultOpen={isNew(a) && i < 3}
                onOpenTool={onOpenTool ? (tool) => { setOpen(false); onOpenTool(tool); } : undefined} />
            ))}
          </div>,
          document.body,
        )}
      </div>
    </div>
  );
}

/** Όταν κάποιος άλλος άλλαξε το project την ίδια ώρα με εσένα. */
export function ConflictBanner({ conflict, onLoadTheirs, onKeepMine, busy }) {
  if (!conflict) return null;
  const who = conflict.updated_by?.display_name || 'Κάποιος άλλος';
  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[140] w-[min(640px,calc(100vw-2rem))] rounded-2xl border border-amber-500/40 bg-slate-950/95 p-4 shadow-2xl backdrop-blur">
      <div className="flex items-start gap-3">
        <AlertTriangle size={18} className="text-amber-400 mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-100">Ο/Η {who} άλλαξε το project ενώ δούλευες</p>
          <p className="mt-1 text-xs text-slate-400">
            Οι τελευταίες αλλαγές σου δεν αποθηκεύτηκαν για να μη σβηστούν οι δικές του/της. Διάλεξε ποια έκδοση θα κρατήσεις.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={onLoadTheirs} disabled={busy}
              className="h-9 rounded-lg bg-slate-100 px-3 text-xs font-bold text-slate-900 hover:bg-white">
              Φόρτωση των αλλαγών του/της
            </button>
            <button type="button" onClick={onKeepMine} disabled={busy}
              className="h-9 inline-flex items-center gap-2 rounded-lg border border-slate-600 px-3 text-xs font-bold text-slate-200 hover:bg-slate-800">
              {busy && <Loader2 size={13} className="animate-spin" />} Κράτα τις δικές μου
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
